import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma, asObject } from '@/server/db';
import { emptySectionData } from '@/lib/schema/sections';
import type { RenderData } from '@/components/render/DocumentRenderer';
import type { Snapshot } from '@/lib/versioning/diff';
import type { EsdscomInput } from '@/lib/esdscom';

export type SectionMap = Record<number, Record<string, unknown>>;

/** Dane sekcji uzupełnione wartościami domyślnymi brakujących kluczy. */
export function toSectionMap(sections: { number: number; data: Prisma.JsonValue }[]): SectionMap {
  const map: SectionMap = {};
  for (let n = 1; n <= 16; n++) {
    const stored = sections.find((s) => s.number === n);
    map[n] = { ...emptySectionData(n), ...asObject(stored?.data) };
  }
  return map;
}

export const componentView = (c: {
  name: string;
  casNumber: string | null;
  ecNumber: string | null;
  indexNumber: string | null;
  reachNumber: string | null;
  concentration: string | null;
  hazardClasses: string[];
  hazardStatements: string[];
  sclNotes: string | null;
  isSvhc: boolean;
}) => ({
  name: c.name,
  casNumber: c.casNumber,
  ecNumber: c.ecNumber,
  indexNumber: c.indexNumber,
  reachNumber: c.reachNumber,
  concentration: c.concentration,
  hazardClasses: c.hazardClasses,
  hazardStatements: c.hazardStatements,
  sclNotes: c.sclNotes,
  isSvhc: c.isSvhc,
});

type Catalogs = Pick<RenderData, 'wasteCatalog' | 'legalCatalog'>;

/** Słowniki wspólne dla wszystkich kart — przy renderze wielu kart pobierz raz. */
export async function loadRenderCatalogs(): Promise<Catalogs> {
  const [wasteCatalog, legal] = await Promise.all([
    prisma.wasteCode.findMany({ orderBy: { code: 'asc' } }),
    prisma.legalReference.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  return { wasteCatalog, legalCatalog: legal.map(({ id, title, journalRef }) => ({ id, title, journalRef })) };
}

export async function buildRenderData(documentId: string, catalogs?: Catalogs): Promise<RenderData | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { sections: true, components: { orderBy: { position: 'asc' } } },
  });
  if (!doc) return null;
  return {
    productName: doc.productName,
    version: doc.version,
    issueDate: doc.issueDate,
    revisionDate: doc.revisionDate,
    ufi: doc.ufi,
    sectionData: toSectionMap(doc.sections),
    components: doc.components.map(componentView),
    ...(catalogs ?? (await loadRenderCatalogs())),
  };
}

/** Pełna, serializowalna kopia treści karty (do wersjonowania). */
export async function buildSnapshot(documentId: string, tx: Prisma.TransactionClient = prisma): Promise<Snapshot> {
  const doc = await tx.document.findUniqueOrThrow({
    where: { id: documentId },
    include: { sections: true, components: { orderBy: { position: 'asc' } } },
  });
  const sections: SectionMap = {};
  for (const s of doc.sections) sections[s.number] = asObject(s.data);
  return {
    meta: { version: doc.version, productName: doc.productName, ufi: doc.ufi },
    sections,
    components: doc.components.map((c) => ({
      name: c.name,
      concentration: c.concentration,
      hazardClasses: c.hazardClasses,
    })),
  };
}

/** Dane karty w postaci wejścia eksportu eSDScom XML. */
export async function loadEsdscomInput(documentId: string, catalogs?: Catalogs): Promise<EsdscomInput | null> {
  const [doc, data] = await Promise.all([
    prisma.document.findUnique({ where: { id: documentId }, select: { id: true, otherNames: true } }),
    buildRenderData(documentId, catalogs),
  ]);
  if (!doc || !data) return null;
  return {
    documentId: doc.id,
    productName: data.productName,
    otherNames: doc.otherNames,
    version: data.version,
    issueDate: data.issueDate,
    revisionDate: data.revisionDate,
    ufi: data.ufi,
    sections: data.sectionData,
    components: data.components,
    wasteCatalog: data.wasteCatalog,
    legalCatalog: data.legalCatalog,
    generatedAt: new Date(),
    system: `sds-manager ${process.env.APP_VERSION ?? 'dev'}`,
  };
}
