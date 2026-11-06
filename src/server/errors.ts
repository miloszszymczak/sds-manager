import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { ZodError } from 'zod';
import type { ActionResult } from '@/lib/action-result';
import { ForbiddenError } from '@/server/auth/guard';
import { LockedError } from '@/server/locks';

/** Błąd walidacji/biznesowy z komunikatem dla użytkownika. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

/**
 * Opakowuje akcję: błędy oczekiwane (blokada, uprawnienia, walidacja) zwraca jako
 * `{ ok: false, error }` — Next.js w produkcji maskuje treść rzuconych wyjątków.
 * Przekierowania i notFound przepuszcza dalej.
 */
export async function result<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof UserError || e instanceof LockedError || e instanceof ForbiddenError) {
      return { ok: false, error: e.message };
    }
    if (e instanceof ZodError) {
      return { ok: false, error: e.issues.map((i) => i.message).join('; ') };
    }
    console.error(e);
    return { ok: false, error: 'Nieoczekiwany błąd serwera.' };
  }
}
