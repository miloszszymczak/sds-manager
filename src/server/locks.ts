import 'server-only';
import { prisma } from '@/server/db';
import { LOCK_TTL_SECONDS, type LockResource, type LockState } from '@/lib/locks';
import type { CurrentUser } from '@/server/auth/session';

export class LockedError extends Error {
  constructor(public holderName: string | null) {
    super(
      holderName
        ? `Zasób jest właśnie edytowany przez: ${holderName}. Spróbuj ponownie później.`
        : 'Utracono blokadę edycji — odśwież stronę.',
    );
    this.name = 'LockedError';
  }
}

/**
 * Atomowe przejęcie/odnowienie blokady (jedno zapytanie, bez wyścigu między podami):
 * wstawiamy wiersz albo nadpisujemy go, jeśli należy do nas, wygasł lub `force`.
 * Czas liczy baza (now()), więc rozjazd zegarów podów nie ma znaczenia.
 */
export async function acquireLock(resource: LockResource, user: CurrentUser, force = false): Promise<LockState> {
  const rows = await prisma.$queryRaw<{ userId: string; expiresAt: Date }[]>`
    INSERT INTO "EditLock" ("resource", "userId", "acquiredAt", "expiresAt")
    VALUES (${resource}, ${user.id}, now(), now() + make_interval(secs => ${LOCK_TTL_SECONDS}))
    ON CONFLICT ("resource") DO UPDATE
      SET "userId"     = EXCLUDED."userId",
          "expiresAt"  = EXCLUDED."expiresAt",
          "acquiredAt" = CASE WHEN "EditLock"."userId" = EXCLUDED."userId"
                              THEN "EditLock"."acquiredAt" ELSE now() END
      WHERE "EditLock"."userId" = EXCLUDED."userId"
         OR "EditLock"."expiresAt" < now()
         OR ${force}
    RETURNING "userId", "expiresAt"`;

  if (rows.length > 0) return { mine: true, holder: null, expiresAt: rows[0].expiresAt.toISOString() };
  return readLock(resource, user);
}

/** Stan blokady bez jej przejmowania. */
export async function readLock(resource: LockResource, user: CurrentUser): Promise<LockState> {
  const lock = await prisma.editLock.findUnique({
    where: { resource },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!lock || lock.expiresAt < new Date()) return { mine: false, holder: null, expiresAt: null };
  return {
    mine: lock.userId === user.id,
    holder: lock.userId === user.id ? null : lock.user,
    expiresAt: lock.expiresAt.toISOString(),
  };
}

export async function releaseLock(resource: LockResource, userId: string): Promise<void> {
  await prisma.editLock.deleteMany({ where: { resource, userId } });
}

/**
 * Warunek każdego zapisu: blokada musi należeć do użytkownika i być ważna.
 * Przy okazji przedłuża dzierżawę. Rzuca LockedError, gdy blokady nie mamy.
 */
export async function assertLock(resource: LockResource, user: CurrentUser): Promise<void> {
  const updated = await prisma.$executeRaw`
    UPDATE "EditLock"
       SET "expiresAt" = now() + make_interval(secs => ${LOCK_TTL_SECONDS})
     WHERE "resource" = ${resource} AND "userId" = ${user.id} AND "expiresAt" > now()`;
  if (updated === 0) {
    const state = await readLock(resource, user);
    throw new LockedError(state.holder?.name ?? null);
  }
}

/**
 * Wykonuje operację pod blokadą zasobu, którego użytkownik nie musi mieć otwartego
 * (np. synchronizacja sekcji 3 karty z widoku mieszaniny). Odmawia, gdy edytuje ktoś inny.
 */
export async function withLock<T>(resource: LockResource, user: CurrentUser, fn: () => Promise<T>): Promise<T> {
  const before = await readLock(resource, user);
  const state = await acquireLock(resource, user);
  if (!state.mine) throw new LockedError(state.holder?.name ?? null);
  try {
    return await fn();
  } finally {
    if (!before.mine) await releaseLock(resource, user.id);
  }
}
