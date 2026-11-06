/** Wspólne (klient + serwer) definicje blokad edycji. */

/** Czas dzierżawy blokady. Klient odnawia ją co LOCK_HEARTBEAT_MS. */
export const LOCK_TTL_SECONDS = 90;
export const LOCK_HEARTBEAT_MS = 25_000;

export type LockResource = `document:${string}` | `mixture:${string}`;

export interface LockState {
  /** Czy blokadę trzyma bieżący użytkownik */
  mine: boolean;
  /** Kto trzyma blokadę (gdy nie my) */
  holder: { id: string; name: string } | null;
  /** Do kiedy ważna (ISO) */
  expiresAt: string | null;
}

export const documentLock = (id: string): LockResource => `document:${id}`;
export const mixtureLock = (id: string): LockResource => `mixture:${id}`;
