/**
 * Budowa modelu etykiety CLP (B2) z danych sekcji 2 karty.
 * Czyste funkcje — testowalne i wspólne dla podglądu i eksportu.
 *
 * ⚠️ Reguły doboru zwrotów P oraz zasady rozmiaru etykiety należy zweryfikować
 * z załącznikami do CLP; poniżej ujęto najczęstsze przypadki.
 */
import { HAZARD_STATEMENT_BY_CODE } from '@/data/hazard-statements';
import { PRECAUTIONARY_BY_CODE } from '@/data/precautionary-statements';
import { PICTOGRAM_BY_CODE } from '@/data/pictograms';

export interface LabelModel {
  productName: string;
  ufi: string | null;
  /** Ilość nominalna opakowania (art. 17 ust. 1 lit. c CLP) */
  nominalQuantity: string | null;
  supplier: { name: string; address: string; phone: string };
  pictograms: { code: string; svg: string }[];
  signalWord: string | null;
  hazardStatements: { code: string; text: string }[];
  precautionaryStatements: { code: string; text: string }[];
  contains: string[];
  supplemental: string[];
}

export interface LabelInput {
  productName: string;
  ufi: string | null;
  nominalQuantity?: string | null;
  supplier: { name: string; address: string; phone: string };
  pictograms: string[];
  signalWord: string | null;
  hazardStatements: string[];
  precautionaryStatements: string[];
  /** dodatkowe informacje z sekcji 2.2 (EUH, „Zawiera…") */
  supplementalText: string;
  /** składniki nadające etykiecie zwrot „Zawiera" (uczulające/nazwane) */
  namedComponents: string[];
}

/** Zalecana maksymalna liczba zwrotów P na etykiecie (art. 28 ust. 3 CLP). */
export const MAX_PRECAUTIONARY = 6;

export function buildLabel(input: LabelInput): LabelModel {
  const pictograms = input.pictograms
    .map((code) => PICTOGRAM_BY_CODE.get(code))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ code: p.code, svg: p.svg }));

  const hazardStatements = input.hazardStatements.map((code) => ({
    code,
    text: HAZARD_STATEMENT_BY_CODE.get(code)?.textPl ?? '',
  }));

  // Dobór zwrotów P: zachowaj kolejność, ale ogranicz liczbę zgodnie z CLP.
  const precautionaryStatements = selectPrecautionary(input.precautionaryStatements).map((code) => ({
    code,
    text: PRECAUTIONARY_BY_CODE.get(code)?.textPl ?? '',
  }));

  // „Zawiera": z jawnie nazwanych składników lub z tekstu 2.2.
  const contains = input.namedComponents.length > 0 ? input.namedComponents : parseContains(input.supplementalText);

  const supplemental = parseEuh(input.supplementalText);

  return {
    productName: input.productName,
    ufi: input.ufi,
    nominalQuantity: input.nominalQuantity ?? null,
    supplier: input.supplier,
    pictograms,
    signalWord: input.signalWord,
    hazardStatements,
    precautionaryStatements,
    contains,
    supplemental,
  };
}

/**
 * Usuwa zwroty zbędne (art. 28 ust. 1 CLP): P202 obok P201 oraz zwrot pojedynczy,
 * który jest już częścią zwrotu łączonego (np. P352 obok P302+P352).
 */
export function removeRedundant(codes: string[]): string[] {
  const combinedParts = new Set(codes.filter((c) => c.includes('+')).flatMap((c) => c.split('+')));
  const set = new Set(codes);
  return codes.filter((c) => {
    if (c === 'P202' && set.has('P201')) return false;
    if (!c.includes('+') && combinedParts.has(c)) return false;
    return true;
  });
}

/**
 * Pierwszeństwo na etykiecie (mniejsza liczba = ważniejszy). Zgodnie z wytycznymi ECHA
 * do etykietowania pierwszeństwo mają zwroty dotyczące narażenia i pierwszej pomocy,
 * środki ochrony indywidualnej i usuwanie; ogólne zalecenia zapobiegawcze — na końcu.
 */
export function precautionaryRank(code: string): number {
  if (/^P30[1-8]/.test(code)) return 0; // W PRZYPADKU połknięcia/kontaktu/narażenia…
  if (code === 'P280' || code === 'P284' || code === 'P501' || code === 'P102') return 1;
  if (code === 'P201' || code === 'P210' || code === 'P260' || code === 'P261') return 2;
  const type = PRECAUTIONARY_BY_CODE.get(code)?.type;
  if (type === 'ZAPOBIEGANIE') return 3;
  if (type === 'REAGOWANIE') return 4;
  return 5;
}

/**
 * Dobiera co najwyżej MAX_PRECAUTIONARY zwrotów P: usuwa zbędne, wybiera najważniejsze
 * wg `precautionaryRank` (remis → kolejność z karty) i zwraca je w kolejności z karty.
 */
export function selectPrecautionary(codes: string[]): string[] {
  const unique = removeRedundant([...new Set(codes)]);
  if (unique.length <= MAX_PRECAUTIONARY) return unique;
  const chosen = new Set(
    unique
      .map((code, i) => ({ code, i, rank: precautionaryRank(code) }))
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .slice(0, MAX_PRECAUTIONARY)
      .map((x) => x.code),
  );
  return unique.filter((c) => chosen.has(c));
}

/** Wyciąga listę po „Zawiera:" z tekstu dodatkowego. */
function parseContains(text: string): string[] {
  const m = text.match(/zawiera:?\s*([^.]+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,;]/)
    .map((s) => s.trim().replace(/\(cas[^)]*\)/i, '').trim())
    .filter(Boolean);
}

/** Wyławia kody EUH z tekstu dodatkowego. */
function parseEuh(text: string): string[] {
  return [...text.matchAll(/EUH\d{3}/g)].map((m) => m[0]);
}
