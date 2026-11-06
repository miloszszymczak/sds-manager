'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma, asObject, toJson } from '@/server/db';
import { requireUser } from '@/server/auth/guard';
import type { CurrentUser } from '@/server/auth/session';
import { assertLock, withLock } from '@/server/locks';
import { documentLock } from '@/lib/locks';
import { result, UserError } from '@/server/errors';
import { mergeSectionData } from '@/server/sections';
import { buildSnapshot } from '@/server/documents';
import { engineInputForDocument } from '@/server/classification';
import { suggest } from '@/lib/classification/suggest';
import { dilutionCompositionRows, packetCompositionRows, packetDocumentName, substanceHazardCodes } from '@/lib/sds-compose';
import { createDocumentRecord, defaultSupplier, loadMixtureComposition } from '@/server/sds-records';
import { syncDocumentCompositionUnderLock } from '@/server/sds-sync';
import { diffSnapshots, summarizeDiff, type Snapshot } from '@/lib/versioning/diff';
import { SECTION_BY_NUMBER } from '@/lib/schema/sections';

const touch = (documentId: string, user: CurrentUser) =>
  prisma.document.update({ where: { id: documentId }, data: { updatedById: user.id } });

/* ─────────────── tworzenie ─────────────── */

export async function createStandaloneDocument(form: FormData) {
  const user = await requireUser('EDITOR');
  const productName = String(form.get('productName') ?? '').trim() || 'Nowa karta charakterystyki';
  const doc = await prisma.$transaction(async (tx) =>
    createDocumentRecord(tx, { productName, supplier: await defaultSupplier(tx), updatedById: user.id }),
  );
  redirect(`/dokumenty/${doc.id}`);
}

/**
 * Tworzy brakujące karty dla wszystkich opakowań wariantu. Treść kopiujemy z karty
 * tego samego opakowania w innym wariancie (skład %m/m jest identyczny), a gdy jej
 * nie ma — budujemy szkic: dostawca, sekcja 3 ze składu, sekcja 2 z silnika klasyfikacji.
 */
export async function createVariantDocuments(variantId: string) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    const created = await prisma.$transaction(async (tx) => {
      const variant = await tx.mixtureVariant.findUniqueOrThrow({
        where: { id: variantId },
        include: { documents: { select: { packetId: true } } },
      });
      const mixture = await loadMixtureComposition(tx, variant.mixtureId);
      const supplier = await defaultSupplier(tx);
      const existing = new Set(variant.documents.map((d) => d.packetId));
      let count = 0;

      for (const packet of mixture.packets) {
        if (existing.has(packet.id)) continue;
        const sibling = await tx.document.findFirst({
          where: { packetId: packet.id, variantId: { not: variantId } },
          orderBy: { updatedAt: 'desc' },
          include: { sections: true },
        });
        const baseSections = sibling
          ? Object.fromEntries(sibling.sections.map((s) => [s.number, asObject(s.data)]))
          : undefined;
        await createDocumentRecord(tx, {
          productName: packetDocumentName(mixture.name, packet, variant.volumeMl),
          variantId,
          packetId: packet.id,
          supplier,
          updatedById: user.id,
          baseSections,
          composition: packetCompositionRows(mixture, packet.id),
        });
        count++;
      }
      return { count, mixtureId: mixture.id };
    });
    revalidatePath(`/mieszaniny/${created.mixtureId}`);
    return created.count;
  });
}

export async function createDilutionDocument(stepId: string) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    const doc = await prisma.$transaction(async (tx) => {
      const step = await tx.dilutionStep.findUniqueOrThrow({ where: { id: stepId } });
      if (step.documentId) throw new UserError('Ten roztwór ma już kartę.');
      const mixture = await loadMixtureComposition(tx, step.mixtureId);
      const doc = await createDocumentRecord(tx, {
        productName: `${mixture.name} — ${step.name}`,
        supplier: await defaultSupplier(tx),
        updatedById: user.id,
        composition: dilutionCompositionRows(mixture, step.waterMl),
      });
      await tx.dilutionStep.update({ where: { id: stepId }, data: { documentId: doc.id } });
      return doc;
    });
    revalidatePath('/mieszaniny');
    return doc.id;
  });
}

export async function duplicateDocument(documentId: string) {
  const user = await requireUser('EDITOR');
  const copy = await prisma.$transaction(async (tx) => {
    const src = await tx.document.findUniqueOrThrow({ where: { id: documentId }, include: { sections: true, components: true } });
    const doc = await tx.document.create({
      data: {
        productName: `${src.productName} (kopia)`,
        otherNames: src.otherNames,
        supplierId: src.supplierId,
        updatedById: user.id,
      },
    });
    await tx.section.createMany({ data: src.sections.map((s) => ({ documentId: doc.id, number: s.number, data: toJson(s.data) })) });
    await tx.component.createMany({
      data: src.components.map(({ id: _id, documentId: _d, ...c }) => ({ ...c, documentId: doc.id })),
    });
    return doc;
  });
  redirect(`/dokumenty/${copy.id}`);
}

export async function deleteDocument(documentId: string) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    await withLock(documentLock(documentId), user, () => prisma.document.delete({ where: { id: documentId } }));
    revalidatePath('/dokumenty');
  });
}

/* ─────────────── edycja (wymaga blokady) ─────────────── */

const metaSchema = z.object({
  productName: z.string().trim().min(1, 'Nazwa produktu nie może być pusta.').optional(),
  version: z.string().trim().min(1).optional(),
  status: z.enum(['SZKIC', 'DO_PRZEGLADU', 'ZATWIERDZONA']).optional(),
  ufi: z.string().trim().optional(),
  otherNames: z.string().optional(),
});

export async function updateDocumentMeta(documentId: string, values: z.input<typeof metaSchema>) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    await assertLock(documentLock(documentId), user);
    const data = metaSchema.parse(values);
    await prisma.document.update({
      where: { id: documentId },
      data: { ...data, ufi: data.ufi === undefined ? undefined : data.ufi || null, revisionDate: new Date(), updatedById: user.id },
    });
    revalidatePath(`/dokumenty/${documentId}`);
  });
}

/**
 * Zapis pól sekcji (autosave). Jedno atomowe zapytanie jsonb — równoległe zapisy
 * różnych pól się nie nadpisują. Klucze spoza schematu sekcji są odrzucane.
 */
export async function saveSectionFields(documentId: string, sectionNumber: number, patch: Record<string, unknown>) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    await assertLock(documentLock(documentId), user);
    const section = SECTION_BY_NUMBER.get(sectionNumber);
    if (!section) throw new UserError('Nieznana sekcja.');
    const allowed = new Set(section.subsections.flatMap((s) => s.fields.map((f) => f.key)));
    const unknown = Object.keys(patch).filter((k) => !allowed.has(k));
    if (unknown.length) throw new UserError(`Nieznane pola sekcji ${sectionNumber}: ${unknown.join(', ')}`);
    await mergeSectionData(documentId, sectionNumber, patch);
    await touch(documentId, user);
  });
}

/* ─────────────── sekcja 3 ─────────────── */

const componentPatch = z
  .object({
    name: z.string(),
    casNumber: z.string().nullable(),
    ecNumber: z.string().nullable(),
    indexNumber: z.string().nullable(),
    reachNumber: z.string().nullable(),
    concentration: z.string().nullable(),
    hazardClasses: z.array(z.string()),
    hazardStatements: z.array(z.string()),
    sclNotes: z.string().nullable(),
    isSvhc: z.boolean(),
  })
  .partial();

export async function addDocumentComponent(documentId: string, substanceCas?: string) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    await assertLock(documentLock(documentId), user);
    const position = await prisma.component.count({ where: { documentId } });
    const s = substanceCas
      ? await prisma.substance.findUnique({ where: { cas: substanceCas }, include: { hazards: { orderBy: { position: 'asc' } } } })
      : null;
    await prisma.component.create({
      data: s
        ? {
            documentId,
            position,
            substanceCas: s.cas,
            name: s.name,
            casNumber: s.cas,
            ecNumber: s.ecNumber,
            indexNumber: s.indexNumber,
            reachNumber: s.reachNumber,
            ...substanceHazardCodes(s),
            sclNotes: s.sclNotes,
            isSvhc: s.isSvhc,
          }
        : { documentId, position, name: 'Nowy składnik' },
    });
    await touch(documentId, user);
    revalidatePath(`/dokumenty/${documentId}`);
  });
}

async function componentDocument(componentId: string) {
  const c = await prisma.component.findUniqueOrThrow({ where: { id: componentId }, select: { documentId: true } });
  return c.documentId;
}

export async function updateDocumentComponent(componentId: string, values: z.input<typeof componentPatch>) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    const documentId = await componentDocument(componentId);
    await assertLock(documentLock(documentId), user);
    await prisma.component.update({ where: { id: componentId }, data: componentPatch.parse(values) });
    await touch(documentId, user);
  });
}

export async function deleteDocumentComponent(componentId: string) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    const documentId = await componentDocument(componentId);
    await assertLock(documentLock(documentId), user);
    await prisma.component.delete({ where: { id: componentId } });
    await touch(documentId, user);
    revalidatePath(`/dokumenty/${documentId}`);
  });
}

/** Odtwarza sekcję 3 ze składu powiązanej mieszaniny (opakowania wariantu lub roztworu roboczego). */
export async function syncDocumentComposition(documentId: string) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    await assertLock(documentLock(documentId), user);
    const count = await syncDocumentCompositionUnderLock(documentId);
    await touch(documentId, user);
    revalidatePath(`/dokumenty/${documentId}`);
    return count;
  });
}

/* ─────────────── klasyfikacja ─────────────── */

export async function computeClassification(documentId: string) {
  await requireUser();
  return suggest(await engineInputForDocument(documentId));
}

/* ─────────────── wersjonowanie ─────────────── */

/**
 * Zamraża migawkę wersji, podbija numer i dopisuje opis zmian do sekcji 16 —
 * wszystko w jednej transakcji.
 */
export async function publishVersion(documentId: string, newVersion?: string, note?: string) {
  return result(async () => {
    const user = await requireUser('EDITOR');
    // Wydanie wersji z widoku historii: blokada przejmowana na czas operacji.
    const changeNote = await withLock(documentLock(documentId), user, () => prisma.$transaction(async (tx) => {
      const snapshot = await buildSnapshot(documentId, tx);
      const previous = await tx.documentSnapshot.findFirst({ where: { documentId }, orderBy: { createdAt: 'desc' } });
      // Diff treści przed podbiciem wersji — inaczej każde wydanie meldowałoby „zmiana: wersja”.
      const changeNote = previous
        ? summarizeDiff(diffSnapshots(previous.payload as unknown as Snapshot, snapshot))
        : 'pierwsze wydanie';
      const version = newVersion?.trim() || snapshot.meta.version;
      snapshot.meta.version = version;

      const s16 = asObject((await tx.section.findUnique({ where: { documentId_number: { documentId, number: 16 } } }))?.data);
      const line = `Wersja ${version} (${new Date().toLocaleDateString('pl-PL')}): ${changeNote}`;
      const prevText = typeof s16.zmiany === 'string' ? s16.zmiany : '';
      await mergeSectionData(documentId, 16, { zmiany: prevText ? `${line}\n${prevText}` : line }, tx);
      // Migawka obejmuje już wpis w sekcji 16 tej wersji.
      snapshot.sections[16] = { ...(snapshot.sections[16] ?? {}), zmiany: prevText ? `${line}\n${prevText}` : line };

      await tx.documentSnapshot.create({
        data: { documentId, version, payload: toJson(snapshot), note: note || null, createdBy: user.name },
      });
      await tx.document.update({ where: { id: documentId }, data: { version, revisionDate: new Date(), updatedById: user.id } });
      return changeNote;
    }));

    revalidatePath(`/dokumenty/${documentId}`);
    revalidatePath(`/dokumenty/${documentId}/historia`);
    return changeNote;
  });
}

export async function deleteSnapshot(id: string) {
  return result(async () => {
    await requireUser('ADMIN');
    const snap = await prisma.documentSnapshot.delete({ where: { id } });
    revalidatePath(`/dokumenty/${snap.documentId}/historia`);
  });
}

