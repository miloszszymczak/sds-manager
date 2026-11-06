/**
 * Czyste obliczenia mieszanin: masa składników, skład %m/m opakowania,
 * skalowanie wariantów objętościowych i stężenia w roztworze roboczym.
 */

export type Unit = 'g' | 'ml';

export interface CompositionInput {
  /** Identyfikator wiersza (zwracany w wyniku) */
  key: string;
  packetId: string;
  quantity: number;
  unit: Unit;
  /** Gęstość substancji [g/ml] — wymagana dla składników w ml */
  density?: number | null;
}

export interface CompositionRow {
  key: string;
  grams: number;
  percent: number;
  /** Przeliczono ml → g przy założonej gęstości 1 g/ml (brak danych o gęstości) */
  assumedDensity: boolean;
}

export const round = (n: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/** Masa składnika [g]; ujemne ilości traktujemy jak zero. */
export function massOf(c: Pick<CompositionInput, 'quantity' | 'unit' | 'density'>): { grams: number; assumedDensity: boolean } {
  const q = c.quantity > 0 ? c.quantity : 0;
  if (c.unit === 'g') return { grams: q, assumedDensity: false };
  const d = c.density && c.density > 0 ? c.density : null;
  return { grams: q * (d ?? 1), assumedDensity: d === null && q > 0 };
}

/** Skład %m/m jednego opakowania (podstawa: suma mas składników tego opakowania). */
export function packetComposition(components: CompositionInput[], packetId: string, dp = 2): CompositionRow[] {
  const rows = components.filter((c) => c.packetId === packetId).map((c) => ({ key: c.key, ...massOf(c) }));
  const total = rows.reduce((s, r) => s + r.grams, 0);
  return rows.map((r) => ({ ...r, percent: total > 0 ? round((r.grams / total) * 100, dp) : 0 }));
}

/** Masa netto opakowania [g] dla wariantu o danym współczynniku skali. */
export function packetMass(components: CompositionInput[], packetId: string, factor = 1): number {
  return components
    .filter((c) => c.packetId === packetId)
    .reduce((s, c) => s + massOf(c).grams * factor, 0);
}

/** Współczynnik skali wariantu względem objętości odniesienia receptury. */
export function variantFactor(variantVolumeMl: number, basisVolumeMl: number): number {
  return basisVolumeMl > 0 ? variantVolumeMl / basisVolumeMl : 0;
}

/**
 * %m/m składników w roztworze roboczym: wszystkie opakowania + woda (1 g/ml).
 * Masa roztworu = Σ mas składników + waterMl.
 */
export function workingSolution(components: CompositionInput[], waterMl: number, dp = 2): CompositionRow[] {
  const rows = components.map((c) => ({ key: c.key, ...massOf(c) }));
  const total = rows.reduce((s, r) => s + r.grams, 0) + Math.max(0, waterMl);
  return rows.map((r) => ({ ...r, percent: total > 0 ? round((r.grams / total) * 100, dp) : 0 }));
}

const plNumber = (n: number, dp: number) => round(n, dp).toString().replace('.', ',');

/** „71,4” — zapis stężenia do sekcji 3 (polski separator). */
export function formatPercent(value: number, dp = 1): string {
  return plNumber(value, dp);
}

/**
 * Stężenie do sekcji 3 karty: śladowa zawartość nie może wyglądać jak „0”,
 * więc wartości poniżej rozdzielczości zapisu podajemy jako „< 0,1”.
 */
export function formatConcentration(value: number, dp = 1): string {
  const min = 10 ** -dp;
  return value > 0 && value < min ? `< ${plNumber(min, dp)}` : plNumber(value, dp);
}

/** „1 L”, „0,5 L”, „100 ml”. */
export function formatVolume(ml: number): string {
  return ml >= 500 ? `${plNumber(ml / 1000, 3)} L` : `${plNumber(ml, 1)} ml`;
}

/** „107 g”, „2,5 g”, „1,2 mg”. */
export function formatMass(g: number): string {
  if (g > 0 && g < 0.1) return `${plNumber(g * 1000, 2)} mg`;
  return `${plNumber(g, g < 10 ? 2 : 1)} g`;
}
