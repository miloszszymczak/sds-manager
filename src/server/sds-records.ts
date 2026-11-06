/**
 * Zapis kart w bazie w ramach transakcji. Moduł nie importuje klienta Prisma
 * (dostaje `tx`), więc korzysta z niego także skrypt seed poza Next.js.
 */
import type { Prisma, Supplier } from '@prisma/client';
import { asObject, toJson } from '@/lib/json';
import { emptySectionData } from '@/lib/schema/sections';
import { supplierBlock, type Composition, type ComponentData } from '@/lib/sds-compose';

type Tx = Prisma.TransactionClient;

export const mixtureCompositionInclude = {
  packets: { orderBy: { position: 'asc' } },
  components: {
    orderBy: { position: 'asc' },
    include: { substance: { include: { hazards: { orderBy: { position: 'asc' } } } } },
  },
} satisfies Prisma.MixtureInclude;

export function loadMixtureComposition(tx: Tx, mixtureId: string) {
  return tx.mixture.findUniqueOrThrow({ where: { id: mixtureId }, include: mixtureCompositionInclude });
}

export function defaultSupplier(tx: Tx) {
  return tx.supplier.findFirst({ orderBy: { createdAt: 'asc' } });
}

export interface NewDocument {
  productName: string;
  variantId?: string | null;
  packetId?: string | null;
  supplier: Supplier | null;
  updatedById?: string | null;
  status?: 'SZKIC' | 'DO_PRZEGLADU' | 'ZATWIERDZONA';
  ufi?: string | null;
  otherNames?: string | null;
  /** Treść sekcji do skopiowania (np. z karty tego samego opakowania w innym wariancie) */
  baseSections?: Record<number, Record<string, unknown>>;
  composition?: Composition;
}

/** Tworzy kartę z kompletem 16 sekcji i (opcjonalnie) składem sekcji 3. */
export async function createDocumentRecord(tx: Tx, input: NewDocument) {
  const doc = await tx.document.create({
    data: {
      productName: input.productName,
      otherNames: input.otherNames ?? null,
      ufi: input.ufi ?? null,
      status: input.status ?? 'SZKIC',
      supplierId: input.supplier?.id,
      variantId: input.variantId ?? null,
      packetId: input.packetId ?? null,
      updatedById: input.updatedById ?? null,
    },
  });

  const sections = Array.from({ length: 16 }, (_, i) => {
    const n = i + 1;
    const data: Record<string, unknown> = { ...emptySectionData(n), ...(input.baseSections?.[n] ?? {}) };
    if (n === 1) {
      data.identyfikator = {
        ...asObject(data.identyfikator as Prisma.JsonValue),
        nazwaProduktu: input.productName,
        ...(input.ufi ? { ufi: input.ufi } : {}),
      };
      if (input.supplier && !input.baseSections?.[1]?.dostawca) data.dostawca = supplierBlock(input.supplier);
    }
    if (n === 2 && input.composition && !input.baseSections?.[2]) Object.assign(data, input.composition.section2);
    return { documentId: doc.id, number: n, data: toJson(data) };
  });
  await tx.section.createMany({ data: sections });

  if (input.composition) await replaceComponents(tx, doc.id, input.composition.rows);
  return doc;
}

/** Zastępuje sekcję 3 karty nowym składem. */
export async function replaceComponents(tx: Tx, documentId: string, rows: ComponentData[]) {
  await tx.component.deleteMany({ where: { documentId } });
  await tx.component.createMany({ data: rows.map((r) => ({ ...r, documentId })) });
}
