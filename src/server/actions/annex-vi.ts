'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth/guard';
import { result, UserError } from '@/server/errors';
import { readXlsxRows } from '@/server/xlsx';
import { indexByCas, mergeHazards, parseAnnexVi, type AnnexViHazard } from '@/lib/annex-vi';
import { HAZARD_CLASS_BY_CODE } from '@/data/hazard-classes';

const MAX_BYTES = 25 * 1024 * 1024;

export interface AnnexViProposal {
  cas: string;
  substanceName: string;
  entryName: string;
  indexNumber: string;
  ecNumber: string | null;
  identifierChanges: string[];
  changes: string[];
  unknownClasses: string[];
  hazards: AnnexViHazard[];
}

export interface AnnexViPreview {
  entries: number;
  columns: Record<string, string>;
  matched: number;
  unchanged: number;
  withoutEntry: string[];
  proposals: AnnexViProposal[];
}

/** Odczytuje arkusz ECHA i porównuje go z biblioteką substancji. Niczego nie zapisuje. */
export async function previewAnnexVi(form: FormData) {
  return result(async (): Promise<AnnexViPreview> => {
    await requireUser('EDITOR');
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) throw new UserError('Wybierz plik .xlsx z tabelą zał. VI.');
    if (file.size > MAX_BYTES) throw new UserError('Plik jest za duży (limit 25 MB).');
    if (!/\.xlsx$/i.test(file.name)) throw new UserError('Obsługiwany jest format .xlsx (zapisz plik .xls jako .xlsx).');

    let parsed;
    try {
      const rows = await readXlsxRows(await file.arrayBuffer(), (names) =>
        Math.max(0, names.findIndex((n) => /annex|table|tabela/i.test(n) && !/history|histor/i.test(n))),
      );
      parsed = parseAnnexVi(rows);
    } catch (e) {
      throw new UserError(`Nie udało się odczytać tabeli: ${(e as Error).message}`);
    }

    const byCas = indexByCas(parsed.entries);
    const substances = await prisma.substance.findMany({ include: { hazards: { orderBy: { position: 'asc' } } } });
    const proposals: AnnexViProposal[] = [];
    let unchanged = 0;
    for (const s of substances) {
      const entry = byCas.get(s.cas);
      if (!entry) continue;
      const { changes } = mergeHazards(s.hazards, entry.hazards);
      const ec = entry.ecNumbers.length === 1 ? entry.ecNumbers[0] : null;
      const identifierChanges = [
        s.indexNumber !== entry.indexNumber && `nr indeksowy: ${s.indexNumber ?? 'brak'} → ${entry.indexNumber}`,
        ec && s.ecNumber !== ec && `nr WE: ${s.ecNumber ?? 'brak'} → ${ec}`,
      ].filter((x): x is string => !!x);
      if (!changes.length && !identifierChanges.length) {
        unchanged++;
        continue;
      }
      proposals.push({
        cas: s.cas,
        substanceName: s.name,
        entryName: entry.name,
        indexNumber: entry.indexNumber,
        ecNumber: ec,
        identifierChanges,
        changes,
        unknownClasses: entry.unknownClasses,
        hazards: entry.hazards,
      });
    }
    return {
      entries: parsed.entries.length,
      columns: parsed.columns,
      matched: proposals.length + unchanged,
      unchanged,
      withoutEntry: substances.filter((s) => !byCas.has(s.cas)).map((s) => s.name),
      proposals,
    };
  });
}

const num = z.number().finite().nullable().optional();
const hazard = z.object({
  hazardClass: z.string().refine((c) => HAZARD_CLASS_BY_CODE.has(c), 'Nieznana klasa zagrożenia.'),
  statement: z.string().nullable(),
  sclMin: num,
  sclStatement: z.string().nullable().optional(),
  limitOnly: z.boolean().optional(),
  mFactorAcute: num,
  mFactorChronic: num,
  ateOral: num,
  ateDermal: num,
  ateInhalDust: num,
  ateInhalVapour: num,
});
const applySchema = z.array(
  z.object({
    cas: z.string(),
    indexNumber: z.string().regex(/^\d{3}-\d{3}-\d{2}-[\dX]$/),
    ecNumber: z.string().regex(/^\d{3}-\d{3}-\d$/).nullable(),
    hazards: z.array(hazard),
  }),
);

/** Zapisuje wybrane propozycje. Scalanie liczone ponownie na bieżących danych (bez nadpisywania cudzych zmian). */
export async function applyAnnexVi(items: z.input<typeof applySchema>) {
  return result(async () => {
    await requireUser('EDITOR');
    const parsed = applySchema.parse(items);
    const source = `zał. VI CLP (arkusz ECHA, import ${new Date().toISOString().slice(0, 10)})`;
    let updated = 0;
    for (const item of parsed) {
      await prisma.$transaction(async (tx) => {
        const substance = await tx.substance.findUnique({ where: { cas: item.cas } });
        if (!substance) return;
        const existing = await tx.substanceHazard.findMany({ where: { substanceCas: item.cas }, orderBy: { position: 'asc' } });
        const { hazards } = mergeHazards(existing, item.hazards);
        await tx.substanceHazard.deleteMany({ where: { substanceCas: item.cas } });
        await tx.substanceHazard.createMany({
          data: hazards.map((h, position) => ({
            substanceCas: item.cas,
            position,
            hazardClass: h.hazardClass,
            statement: h.statement ?? null,
            sclMin: h.sclMin ?? null,
            sclStatement: h.sclStatement ?? null,
            limitOnly: h.limitOnly ?? false,
            mFactorAcute: h.mFactorAcute ?? null,
            mFactorChronic: h.mFactorChronic ?? null,
            ateOral: h.ateOral ?? null,
            ateDermal: h.ateDermal ?? null,
            ateInhalDust: h.ateInhalDust ?? null,
            ateInhalVapour: h.ateInhalVapour ?? null,
            note: h.note ?? null,
          })),
        });
        await tx.substance.update({
          where: { cas: item.cas },
          data: { indexNumber: item.indexNumber, ...(item.ecNumber ? { ecNumber: item.ecNumber } : {}), sourceRef: source },
        });
        updated++;
      });
    }
    revalidatePath('/substancje');
    return updated;
  });
}
