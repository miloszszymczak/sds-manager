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
 * Ogranicza liczbę zwrotów P do MAX, preferując po jednym z każdej grupy
 * (zapobieganie/reagowanie/przechowywanie/usuwanie), a następnie uzupełnia
 * pozostałymi. Wynik zachowuje kolejność wejściową.
 */
export function selectPrecautionary(codes: string[]): string[] {
  if (codes.length <= MAX_PRECAUTIONARY) return codes;
  const byType = new Map<string, string[]>();
  for (const c of codes) {
    const t = PRECAUTIONARY_BY_CODE.get(c)?.type ?? 'INNE';
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(c);
  }
  const order = ['OGOLNE', 'ZAPOBIEGANIE', 'REAGOWANIE', 'PRZECHOWYWANIE', 'USUWANIE', 'INNE'];
  const picked: string[] = [];
  // runda 1: po jednym z każdej grupy
  for (const t of order) {
    const list = byType.get(t);
    if (list && list.length) picked.push(list.shift()!);
  }
  // runda 2: uzupełnij resztą w kolejności wejściowej
  for (const c of codes) {
    if (picked.length >= MAX_PRECAUTIONARY) break;
    if (!picked.includes(c)) picked.push(c);
  }
  // Na etykiecie zwroty idą w kolejności z karty (zapobieganie → reagowanie → …), nie w kolejności doboru.
  const chosen = new Set(picked.slice(0, MAX_PRECAUTIONARY));
  return codes.filter((c) => chosen.has(c));
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
