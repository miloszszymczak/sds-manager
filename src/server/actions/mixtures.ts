'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth/guard';
import type { CurrentUser } from '@/server/auth/session';
import { assertLock, LockedError, withLock } from '@/server/locks';
import { documentLock, mixtureLock } from '@/lib/locks';
import { result, UserError } from '@/server/errors';
import { syncDocumentCompositionUnderLock } from '@/server/sds-sync';

const path = (id: string) => `/mieszaniny/${id}`;

async function editMixture(mixtureId: string): Promise<CurrentUser> {
  const user = await requireUser('EDITOR');
  await assertLock(mixtureLock(mixtureId), user);
  return user;
}

const touch = (mixtureId: string) => prisma.mixture.update({ where: { id: mixtureId }, data: { updatedAt: new Date() } });

/* ─────────────── mieszanina ─────────────── */

export async function createMixture(form: FormData) {
  await requireUser('EDITOR');
  const name = String(form.get('name') ?? '').trim() || 'Nowa mieszanina';
  const mixture = await prisma.mixture.create({
    data: {
      name,
      packets: { create: { label: '', position: 0 } },
      variants: { create: { volumeMl: 1000 } },
    },
  });
  redirect(path(mixture.id));
}

const mixtureSchema = z
  .object({
    name: z.string().trim().min(1, 'Podaj nazwę mieszaniny.'),
    code: z.string().trim().transform((v) => v || null).nullable(),
    description: z.string().nullable(),
    form: z.enum(['POWDER', 'LIQUID', 'PASTE']),
    basisVolumeMl: z.number().positive('Objętość odniesienia musi być dodatnia.'),
    notes: z.string().nullable(),
  })
  .partial();

export async function updateMixture(id: string, values: z.input<typeof mixtureSchema>) {
  return result(async () => {
    await editMixture(id);
    const data = mixtureSchema.parse(values);
    if (data.code && (await prisma.mixture.findFirst({ where: { code: data.code, id: { not: id } } }))) {
      throw new UserError(`Kod ${data.code} jest już używany.`);
    }
    await prisma.mixture.update({ where: { id }, data });
    revalidatePath(path(id));
  });
}

export async function deleteMixture(id: string) {
  const res = await result(async () => {
    const user = await requireUser('EDITOR');
    await withLock(mixtureLock(id), user, async () => {
      const inProducts = await prisma.productItem.count({ where: { variant: { mixtureId: id } } });
      if (inProducts) throw new UserError('Mieszanina występuje w produktach — najpierw usuń ją z zestawów.');
      await prisma.mixture.delete({ where: { id } });
    });
  });
  if (res.ok) redirect('/mieszaniny');
  return res;
}

/* ─────────────── opakowania ─────────────── */

const nextLabel = (used: string[]) => {
  for (let i = 0; i < 26; i++) {
    const l = String.fromCharCode(65 + i);
    if (!used.includes(l)) return l;
  }
  return String(used.length + 1);
};

/** Dodaje opakowanie. Mieszanina jednoopakowaniowa staje się wieloczęściowa: „A”, „B”… */
export async function addPacket(mixtureId: string) {
  return result(async () => {
    await editMixture(mixtureId);
    await prisma.$transaction(async (tx) => {
      const packets = await tx.mixturePacket.findMany({ where: { mixtureId }, orderBy: { position: 'asc' } });
      const unnamed = packets.find((p) => p.label === '');
      if (unnamed) await tx.mixturePacket.update({ where: { id: unnamed.id }, data: { label: 'A', name: 'część A' } });
      const used = packets.map((p) => (p.label === '' ? 'A' : p.label));
      const label = nextLabel(used);
      await tx.mixturePacket.create({ data: { mixtureId, label, name: `część ${label}`, position: packets.length } });
    });
    revalidatePath(path(mixtureId));
  });
}

export async function renamePacket(packetId: string, name: string) {
  return result(async () => {
    const packet = await prisma.mixturePacket.findUniqueOrThrow({ where: { id: packetId } });
    await editMixture(packet.mixtureId);
    await prisma.mixturePacket.update({ where: { id: packetId }, data: { name: name.trim() || null } });
    revalidatePath(path(packet.mixtureId));
  });
}

export async function deletePacket(packetId: string) {
  return result(async () => {
    const packet = await prisma.mixturePacket.findUniqueOrThrow({
      where: { id: packetId },
      include: { _count: { select: { components: true, documents: true } } },
    });
    await editMixture(packet.mixtureId);
    if (packet._count.components) throw new UserError('Opakowanie ma składniki — przenieś je lub usuń.');
    if (packet._count.documents) throw new UserError('Opakowanie ma karty charakterystyki — usuń je najpierw.');
    const remaining = await prisma.mixturePacket.count({ where: { mixtureId: packet.mixtureId } });
    if (remaining <= 1) throw new UserError('Mieszanina musi mieć co najmniej jedno opakowanie.');
    await prisma.mixturePacket.delete({ where: { id: packetId } });
    revalidatePath(path(packet.mixtureId));
  });
}

/* ─────────────── składniki ─────────────── */

export async function addMixtureComponent(mixtureId: string, substanceCas: string, packetId: string) {
  return result(async () => {
    await editMixture(mixtureId);
    const packet = await prisma.mixturePacket.findFirst({ where: { id: packetId, mixtureId } });
    if (!packet) throw new UserError('Nieznane opakowanie.');
    const position = await prisma.mixtureComponent.count({ where: { mixtureId } });
    await prisma.mixtureComponent.create({ data: { mixtureId, packetId, substanceCas, position } });
    await touch(mixtureId);
    revalidatePath(path(mixtureId));
  });
}

const componentSchema = z
  .object({
    quantity: z.number().min(0, 'Ilość nie może być ujemna.'),
    unit: z.enum(['g', 'ml']),
    packetId: z.string(),
    note: z.string().nullable(),
  })
  .partial();

export async function updateMixtureComponent(id: string, values: z.input<typeof componentSchema>) {
  return result(async () => {
    const comp = await prisma.mixtureComponent.findUniqueOrThrow({ where: { id } });
    await editMixture(comp.mixtureId);
    const data = componentSchema.parse(values);
    if (data.packetId && !(await prisma.mixturePacket.findFirst({ where: { id: data.packetId, mixtureId: comp.mixtureId } }))) {
      throw new UserError('Nieznane opakowanie.');
    }
    await prisma.mixtureComponent.update({ where: { id }, data });
    await touch(comp.mixtureId);
    revalidatePath(path(comp.mixtureId));
  });
}

export async function removeMixtureComponent(id: string) {
  return result(async () => {
    const comp = await prisma.mixtureComponent.findUniqueOrThrow({ where: { id } });
    await editMixture(comp.mixtureId);
    await prisma.mixtureComponent.delete({ where: { id } });
    await touch(comp.mixtureId);
    revalidatePath(path(comp.mixtureId));
  });
}

/* ─────────────── warianty objętościowe ─────────────── */

export async function addVariant(mixtureId: string, volumeMl: number, sku?: string) {
  return result(async () => {
    await editMixture(mixtureId);
    const volume = z.number().positive('Objętość musi być dodatnia.').parse(volumeMl);
    if (await prisma.mixtureVariant.findUnique({ where: { mixtureId_volumeMl: { mixtureId, volumeMl: volume } } })) {
      throw new UserError('Taki wariant już istnieje.');
    }
    await prisma.mixtureVariant.create({ data: { mixtureId, volumeMl: volume, sku: sku?.trim() || null } });
    revalidatePath(path(mixtureId));
  });
}

export async function deleteVariant(variantId: string) {
  return result(async () => {
    const variant = await prisma.mixtureVariant.findUniqueOrThrow({
      where: { id: variantId },
      include: { _count: { select: { documents: true, productItems: true } } },
    });
    await editMixture(variant.mixtureId);
    if (variant._count.productItems) throw new UserError('Wariant jest częścią produktu — usuń go najpierw z zestawu.');
    if (variant._count.documents) throw new UserError('Wariant ma karty charakterystyki — usuń je najpierw.');
    await prisma.mixtureVariant.delete({ where: { id: variantId } });
    revalidatePath(path(variant.mixtureId));
  });
}

/* ─────────────── roztwory robocze ─────────────── */

export async function addDilution(mixtureId: string, name: string, waterMl: number) {
  return result(async () => {
    await editMixture(mixtureId);
    const position = await prisma.dilutionStep.count({ where: { mixtureId } });
    await prisma.dilutionStep.create({
      data: { mixtureId, name: name.trim() || 'Roztwór roboczy', waterMl: Math.max(0, waterMl || 0), position },
    });
    revalidatePath(path(mixtureId));
  });
}

export async function updateDilution(id: string, values: { name?: string; waterMl?: number }) {
  return result(async () => {
    const step = await prisma.dilutionStep.findUniqueOrThrow({ where: { id } });
    await editMixture(step.mixtureId);
    await prisma.dilutionStep.update({
      where: { id },
      data: {
        name: values.name?.trim() || undefined,
        waterMl: values.waterMl === undefined ? undefined : Math.max(0, values.waterMl),
      },
    });
    revalidatePath(path(step.mixtureId));
  });
}

export async function removeDilution(id: string) {
  return result(async () => {
    const step = await prisma.dilutionStep.findUniqueOrThrow({ where: { id } });
    await editMixture(step.mixtureId);
    await prisma.dilutionStep.delete({ where: { id } });
    revalidatePath(path(step.mixtureId));
  });
}

/* ─────────────── synchronizacja kart ─────────────── */

/**
 * Odtwarza sekcję 3 wszystkich kart mieszaniny (opakowania wariantów i roztwory).
 * Karty edytowane właśnie przez innych użytkowników są pomijane i raportowane.
 */
export async function syncMixtureDocuments(mixtureId: string) {
  return result(async () => {
    const user = await editMixture(mixtureId);
    const docs = await prisma.document.findMany({
      where: { OR: [{ packet: { mixtureId } }, { dilution: { mixtureId } }] },
      select: { id: true, productName: true },
    });
    const skipped: string[] = [];
    for (const d of docs) {
      try {
        await withLock(documentLock(d.id), user, () => syncDocumentCompositionUnderLock(d.id));
      } catch (e) {
        if (e instanceof LockedError) skipped.push(`${d.productName} (${e.holderName ?? 'zablokowana'})`);
        else throw e;
      }
    }
    revalidatePath(path(mixtureId));
    return { updated: docs.length - skipped.length, skipped };
  });
}
