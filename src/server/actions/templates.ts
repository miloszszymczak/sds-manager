'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma, toJson } from '@/server/db';
import { requireUser } from '@/server/auth/guard';
import { result } from '@/server/errors';

export async function createSectionTemplate(name: string, section: number, data: Record<string, unknown>) {
  return result(async () => {
    await requireUser('EDITOR');
    const n = z.number().int().min(1).max(16).parse(section);
    await prisma.sectionTemplate.create({ data: { name: name.trim() || `Szablon sekcji ${n}`, section: n, data: toJson(data) } });
    revalidatePath('/szablony');
  });
}

export async function deleteSectionTemplate(id: string) {
  return result(async () => {
    await requireUser('EDITOR');
    await prisma.sectionTemplate.delete({ where: { id } });
    revalidatePath('/szablony');
  });
}
