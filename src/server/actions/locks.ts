'use server';

import { z } from 'zod';
import { requireUser } from '@/server/auth/guard';
import { acquireLock, readLock, releaseLock } from '@/server/locks';
import type { LockResource, LockState } from '@/lib/locks';

const resourceSchema = z.string().regex(/^(document|mixture):[A-Za-z0-9_-]{1,64}$/) as unknown as z.ZodType<LockResource>;

/** Przejęcie lub odnowienie blokady (heartbeat). Podgląd (VIEWER) nigdy nie blokuje. */
export async function lockResource(resource: string): Promise<LockState> {
  const user = await requireUser();
  const res = resourceSchema.parse(resource);
  if (user.role === 'VIEWER') return readLock(res, user);
  return acquireLock(res, user);
}

/** Wymuszone przejęcie blokady — tylko administrator. */
export async function forceLock(resource: string): Promise<LockState> {
  const user = await requireUser('ADMIN');
  return acquireLock(resourceSchema.parse(resource), user, true);
}

export async function unlockResource(resource: string): Promise<void> {
  const user = await requireUser();
  await releaseLock(resourceSchema.parse(resource), user.id);
}
