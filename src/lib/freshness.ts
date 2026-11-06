/**
 * Ocena aktualności danych regulacyjnych (F4.2). Czyste funkcje.
 * Dane wymagają okresowej weryfikacji (klasyfikacja zharmonizowana ECHA,
 * lista SVHC, teksty jednolite Dz.U.). Po upływie progu — sygnał do sprawdzenia.
 */

/** Próg, po którym dane uznajemy za wymagające ponownej weryfikacji (dni). */
export const STALE_AFTER_DAYS = 365;

export type Freshness = 'never' | 'fresh' | 'stale';

export function freshnessOf(lastVerified: Date | string | null | undefined): Freshness {
  if (!lastVerified) return 'never';
  const d = new Date(lastVerified);
  if (Number.isNaN(d.getTime())) return 'never'; // data nieczytelna — traktuj jak brak
  const days = (Date.now() - d.getTime()) / 86_400_000;
  return days > STALE_AFTER_DAYS ? 'stale' : 'fresh';
}

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  never: 'niezweryfikowana',
  fresh: 'aktualna',
  stale: 'do weryfikacji',
};
