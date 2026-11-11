/**
 * Idempotentny seed: słowniki, konto administratora, substancje/mieszaniny/produkty
 * z arkusza „Chemikalia” oraz karty D-76. Niczego nie nadpisuje — tworzy tylko
 * brakujące rekordy, więc można go bezpiecznie uruchamiać przy każdym wdrożeniu.
 *
 *   npm run db:seed            (lokalnie)
 *   node dist/seed.cjs         (w kontenerze — Job migracji w Kubernetes)
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { WASTE_CODES, LEGAL_REFERENCES } from '../src/data/reference-data';
import { hashPassword } from '../src/server/auth/password';
import { packetCompositionRows, packetDocumentName } from '../src/lib/sds-compose';
import { createDocumentRecord, defaultSupplier, loadMixtureComposition } from '../src/server/sds-records';
import { SUBSTANCES, MIXTURES, PRODUCTS } from './data/catalog';
import { SECTIONS_A, SECTIONS_B } from './data/d76-sections';

const prisma = new PrismaClient();
const log = (msg: string) => console.log(`→ ${msg}`);

async function seedCatalogs() {
  for (const w of WASTE_CODES) await prisma.wasteCode.upsert({ where: { code: w.code }, update: {}, create: w });
  if ((await prisma.legalReference.count()) === 0) {
    await prisma.legalReference.createMany({ data: LEGAL_REFERENCES });
  }
  log(`słowniki: ${WASTE_CODES.length} kodów odpadów, ${LEGAL_REFERENCES.length} podstaw prawnych`);
}

async function seedAdmin() {
  if ((await prisma.user.count()) > 0) return log('użytkownicy już istnieją — pomijam konto startowe');
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    return log('UWAGA: brak ADMIN_EMAIL/ADMIN_PASSWORD — nie utworzono konta administratora');
  }
  await prisma.user.create({
    data: { email, name: process.env.ADMIN_NAME || 'Administrator', role: 'ADMIN', passwordHash: await hashPassword(password) },
  });
  log(`utworzono administratora ${email}`);
}

async function seedSupplier() {
  if (await prisma.supplier.count()) return;
  await prisma.supplier.create({
    data: {
      name: 'Miłosz Szymczak',
      street: 'ul. Ameriga Vespucciego 43/23',
      postalCode: '51-505',
      city: 'Wrocław',
      phone: '+48 780 16 32 64',
      email: 'msds@wyszlo.pro',
      website: 'wyszlo.pro',
      bdo: '000682063',
    },
  });
  log('dostawca domyślny');
}

async function seedSubstances() {
  let created = 0;
  for (const { hazards = [], verified, exposureLimits, ...s } of SUBSTANCES) {
    if (await prisma.substance.findUnique({ where: { cas: s.cas } })) continue;
    await prisma.substance.create({
      data: {
        ...s,
        exposureLimits: exposureLimits as Prisma.InputJsonValue | undefined,
        sourceRef: verified ? 'karty producentów (D-76), 2026' : 'arkusz „Chemikalia” — import wstępny',
        lastVerified: verified ? new Date() : null,
        hazards: { create: hazards.map((h, position) => ({ ...h, position })) },
      },
    });
    created++;
  }
  log(`substancje: ${created} nowych (łącznie w danych: ${SUBSTANCES.length})`);
}

/**
 * Uzupełnienie istniejących baz o stężenia graniczne dla skóry/oczu (od wersji 1.1):
 * dotyczy tylko substancji, które nie mają jeszcze żadnego wpisu „tylko SCL”.
 */
async function seedConcentrationLimits() {
  let updated = 0;
  for (const s of SUBSTANCES) {
    const limits = (s.hazards ?? []).filter((h) => h.limitOnly);
    if (!limits.length) continue;
    const existing = await prisma.substance.findUnique({ where: { cas: s.cas }, include: { hazards: true } });
    if (!existing || existing.hazards.some((h) => h.limitOnly)) continue;
    await prisma.$transaction(async (tx) => {
      // granica dla klasy własnej (np. Skin Corr. 1A ≥ 5 %), jeśli jeszcze nie ustawiona
      for (const own of (s.hazards ?? []).filter((h) => !h.limitOnly && h.sclMin != null)) {
        await tx.substanceHazard.updateMany({
          where: { substanceCas: s.cas, hazardClass: own.hazardClass, sclMin: null },
          data: { sclMin: own.sclMin },
        });
      }
      await tx.substanceHazard.createMany({
        data: limits.map((h, i) => ({ ...h, substanceCas: s.cas, position: existing.hazards.length + i })),
      });
    });
    updated++;
  }
  if (updated) log(`stężenia graniczne (SCL) uzupełnione dla ${updated} substancji`);
}

async function seedMixtures() {
  let created = 0;
  for (const m of MIXTURES) {
    if (await prisma.mixture.findUnique({ where: { code: m.code } })) continue;
    await prisma.$transaction(async (tx) => {
      const packets = m.packets.length ? m.packets : [{ label: '', name: '' }];
      const mixture = await tx.mixture.create({
        data: {
          code: m.code,
          name: m.name,
          description: m.description,
          form: m.form,
          basisVolumeMl: m.basisVolumeMl,
          notes: m.notes,
          packets: { create: packets.map((p, position) => ({ label: p.label, name: p.name || null, position })) },
          variants: { create: m.variants.map((volumeMl) => ({ volumeMl, sku: `${m.code}-${volumeMl}` })) },
          dilutions: { create: (m.dilutions ?? []).map((d, position) => ({ ...d, position })) },
        },
        include: { packets: true },
      });
      const packetId = new Map(mixture.packets.map((p) => [p.label, p.id]));
      await tx.mixtureComponent.createMany({
        data: m.components.map((c, position) => ({
          mixtureId: mixture.id,
          packetId: packetId.get(c.packet ?? '') ?? mixture.packets[0].id,
          substanceCas: c.cas,
          quantity: c.quantity,
          unit: c.unit ?? 'g',
          note: c.note,
          position,
        })),
      });
    });
    created++;
  }
  log(`mieszaniny: ${created} nowych (łącznie w danych: ${MIXTURES.length})`);
}

async function seedProducts() {
  let created = 0;
  for (const p of PRODUCTS) {
    if (await prisma.product.findUnique({ where: { sku: p.sku } })) continue;
    const variants = await Promise.all(
      p.items.map((i) =>
        prisma.mixtureVariant.findFirstOrThrow({ where: { mixture: { code: i.mixture }, volumeMl: i.volumeMl } }),
      ),
    );
    await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        items: { create: variants.map((v, position) => ({ variantId: v.id, quantity: p.items[position].quantity ?? 1, position })) },
      },
    });
    created++;
  }
  log(`produkty: ${created} nowych (łącznie w danych: ${PRODUCTS.length})`);
}

/** Karty D-76: treść zweryfikowana wcześniej; wariant 0,5 L dziedziczy treść po 1 L. */
async function seedD76Documents() {
  const mixture = await prisma.mixture.findUnique({ where: { code: 'D76' }, include: { variants: { orderBy: { volumeMl: 'desc' } } } });
  if (!mixture) return;
  if (await prisma.document.count({ where: { variant: { mixtureId: mixture.id } } })) return log('karty D-76 już istnieją');

  const legal = await prisma.legalReference.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true } });
  const section15 = {
    przepisy: legal.map((l) => l.id),
    ocenaBezpieczenstwa: 'Dla tego produktu (mieszaniny) ocena bezpieczeństwa chemicznego nie była przeprowadzona.',
  };
  const content: Record<string, { sections: Record<number, Record<string, unknown>>; ufi: string; otherNames: string }> = {
    A: { sections: { ...SECTIONS_A, 15: section15 }, ufi: 'JXR2-K0MV-900S-YSDM', otherNames: 'D-76 część A; mieszanina wywołująca' },
    B: {
      sections: { ...SECTIONS_B, 15: section15, 16: SECTIONS_A[16] },
      ufi: 'F1S2-30A8-M009-N3YP',
      otherNames: 'D-76 część B; mieszanina konserwująco-alkalizująca',
    },
  };

  await prisma.$transaction(async (tx) => {
    const comp = await loadMixtureComposition(tx, mixture.id);
    const supplier = await defaultSupplier(tx);
    for (const variant of mixture.variants) {
      for (const packet of comp.packets) {
        const c = content[packet.label];
        await createDocumentRecord(tx, {
          productName: `wyszło fotochemia — ${packetDocumentName('wywoływacz D-76', packet, variant.volumeMl)}`,
          variantId: variant.id,
          packetId: packet.id,
          supplier,
          status: 'ZATWIERDZONA',
          ufi: c.ufi,
          otherNames: c.otherNames,
          baseSections: c.sections,
          composition: packetCompositionRows(comp, packet.id),
        });
      }
    }
  }, { timeout: 30_000 });
  log(`karty D-76: ${mixture.variants.length * 2}`);
}

async function main() {
  await seedCatalogs();
  await seedAdmin();
  await seedSupplier();
  await seedSubstances();
  await seedConcentrationLimits();
  await seedMixtures();
  await seedProducts();
  await seedD76Documents();
  console.log('✓ Seed zakończony.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
