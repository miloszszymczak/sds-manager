'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth/guard';
import { result, UserError } from '@/server/errors';
import { isValidCas, normalizeCas } from '@/lib/cas';
import { HAZARD_CLASS_BY_CODE } from '@/data/hazard-classes';

const optional = z
  .string()
  .trim()
  .transform((v) => v || null)
  .nullable()
  .optional();

const casSchema = z
  .string()
  .transform(normalizeCas)
  .refine(isValidCas, 'Nieprawidłowy numer CAS (format lub cyfra kontrolna).');

const substanceFields = z.object({
  name: z.string().trim().min(1, 'Podaj nazwę substancji.'),
  nameEn: optional,
  ecNumber: optional,
  indexNumber: optional,
  reachNumber: optional,
  molecularFormula: optional,
  molarMass: optional,
  sclNotes: optional,
  notes: optional,
  density: z.number().positive('Gęstość musi być dodatnia.').nullable().optional(),
  isSvhc: z.boolean().optional(),
});

export async function createSubstance(_prev: unknown, form: FormData) {
  const res = await result(async () => {
    await requireUser('EDITOR');
    const cas = casSchema.parse(String(form.get('cas') ?? ''));
    if (await prisma.substance.findUnique({ where: { cas } })) throw new UserError(`Substancja o numerze CAS ${cas} już istnieje.`);
    const data = substanceFields.parse({
      name: String(form.get('name') ?? ''),
      nameEn: String(form.get('nameEn') ?? ''),
      ecNumber: String(form.get('ecNumber') ?? ''),
      molecularFormula: String(form.get('molecularFormula') ?? ''),
      isSvhc: form.get('isSvhc') === 'on',
    });
    await prisma.substance.create({ data: { cas, ...data } });
    return cas;
  });
  if (res.ok) redirect(`/substancje/${encodeURIComponent(res.data)}`);
  return res;
}

const updateSchema = substanceFields.partial().extend({ cas: casSchema.optional() });

/** Aktualizacja danych substancji; zmiana CAS kaskadowo aktualizuje powiązania. */
export async function updateSubstance(cas: string, values: z.input<typeof updateSchema>) {
  return result(async () => {
    await requireUser('EDITOR');
    const data = updateSchema.parse(values);
    if (data.cas && data.cas !== cas && (await prisma.substance.findUnique({ where: { cas: data.cas } }))) {
      throw new UserError(`Numer CAS ${data.cas} jest już przypisany do innej substancji.`);
    }
    const updated = await prisma.substance.update({ where: { cas }, data });
    revalidatePath('/substancje');
    return updated.cas;
  });
}

export async function deleteSubstance(cas: string) {
  return result(async () => {
    await requireUser('EDITOR');
    const used = await prisma.mixtureComponent.findMany({
      where: { substanceCas: cas },
      select: { mixture: { select: { name: true } } },
      distinct: ['mixtureId'],
    });
    if (used.length) {
      throw new UserError(`Substancja jest składnikiem mieszanin: ${used.map((u) => u.mixture.name).join(', ')}.`);
    }
    await prisma.substance.delete({ where: { cas } });
    revalidatePath('/substancje');
  });
}

const num = z.number().finite().nullable().optional();
const hazardSchema = z.object({
  hazardClass: z.string().refine((c) => HAZARD_CLASS_BY_CODE.has(c), 'Nieznana klasa zagrożenia.'),
  statement: z.string().trim().nullable().optional(),
  mFactorAcute: num,
  mFactorChronic: num,
  ateOral: num,
  ateDermal: num,
  ateInhalDust: num,
  ateInhalVapour: num,
  sclMin: num,
  sclStatement: z.string().trim().nullable().optional(),
  note: z.string().nullable().optional(),
});

export type HazardInput = z.input<typeof hazardSchema>;

/** Zastępuje komplet danych zagrożeń substancji (transakcyjnie). */
export async function replaceSubstanceHazards(cas: string, hazards: HazardInput[]) {
  return result(async () => {
    await requireUser('EDITOR');
    const rows = z.array(hazardSchema).parse(hazards);
    await prisma.$transaction([
      prisma.substanceHazard.deleteMany({ where: { substanceCas: cas } }),
      prisma.substanceHazard.createMany({
        data: rows.map((h, position) => ({
          ...h,
          statement: h.statement || null,
          sclStatement: h.sclStatement || null,
          note: h.note || null,
          substanceCas: cas,
          position,
        })),
      }),
    ]);
    revalidatePath(`/substancje/${encodeURIComponent(cas)}`);
  });
}

export async function markSubstanceVerified(cas: string, sourceRef?: string) {
  return result(async () => {
    await requireUser('EDITOR');
    await prisma.substance.update({
      where: { cas },
      data: { lastVerified: new Date(), ...(sourceRef?.trim() ? { sourceRef: sourceRef.trim() } : {}) },
    });
    revalidatePath('/substancje');
    revalidatePath(`/substancje/${encodeURIComponent(cas)}`);
  });
}
