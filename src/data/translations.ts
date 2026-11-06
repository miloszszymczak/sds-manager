/**
 * Tłumaczenia zwrotów H/P (F4.3). Zwroty H i P to tekst standaryzowany,
 * publikowany przez ECHA we wszystkich językach UE — dlatego można je
 * tłumaczyć automatycznie ze słownika.
 *
 * ⚠️ Zakres: poniżej ujęto zwroty używane w przykładach oraz najczęstsze.
 * Pełne wydanie wielojęzyczne wymaga zaimportowania kompletu zwrotów z ECHA
 * oraz przetłumaczenia etykiet sekcji i treści wpisywanej ręcznie.
 */
import { HAZARD_STATEMENT_BY_CODE } from './hazard-statements';
import { PRECAUTIONARY_BY_CODE } from './precautionary-statements';

export type Lang = 'pl' | 'en';

/** Angielskie brzmienie zwrotów H (zał. III do CLP, wersja EN). */
const H_EN: Record<string, string> = {
  H302: 'Harmful if swallowed.',
  H312: 'Harmful in contact with skin.',
  H315: 'Causes skin irritation.',
  H317: 'May cause an allergic skin reaction.',
  H318: 'Causes serious eye damage.',
  H319: 'Causes serious eye irritation.',
  H332: 'Harmful if inhaled.',
  H335: 'May cause respiratory irritation.',
  H341: 'Suspected of causing genetic defects.',
  H351: 'Suspected of causing cancer.',
  H360FD: 'May damage fertility. May damage the unborn child.',
  H361fd: 'Suspected of damaging fertility. Suspected of damaging the unborn child.',
  H373: 'May cause damage to organs through prolonged or repeated exposure.',
  H400: 'Very toxic to aquatic life.',
  H410: 'Very toxic to aquatic life with long lasting effects.',
  H411: 'Toxic to aquatic life with long lasting effects.',
};

/** Angielskie brzmienie zwrotów P (zał. IV do CLP, wersja EN). */
const P_EN: Record<string, string> = {
  P201: 'Obtain special instructions before use.',
  P202: 'Do not handle until all safety precautions have been read and understood.',
  P260: 'Do not breathe dust/fume/gas/mist/vapours/spray.',
  P264: 'Wash hands thoroughly after handling.',
  P270: 'Do not eat, drink or smoke when using this product.',
  P272: 'Contaminated work clothing should not be allowed out of the workplace.',
  P273: 'Avoid release to the environment.',
  P280: 'Wear protective gloves/protective clothing/eye protection/face protection.',
  'P302+P352': 'IF ON SKIN: Wash with plenty of water.',
  'P305+P351+P338':
    'IF IN EYES: Rinse cautiously with water for several minutes. Remove contact lenses, if present and easy to do. Continue rinsing.',
  'P308+P313': 'IF exposed or concerned: Get medical advice/attention.',
  P391: 'Collect spillage.',
  P405: 'Store locked up.',
  P501: 'Dispose of contents/container in accordance with national regulations.',
};

/** Zwrot H w danym języku (fallback: polski). */
export function tHazard(code: string, lang: Lang): string {
  if (lang === 'en' && H_EN[code]) return H_EN[code];
  return HAZARD_STATEMENT_BY_CODE.get(code)?.textPl ?? '';
}

/** Zwrot P w danym języku (fallback: polski). */
export function tPrecautionary(code: string, lang: Lang): string {
  if (lang === 'en' && P_EN[code]) return P_EN[code];
  return PRECAUTIONARY_BY_CODE.get(code)?.textPl ?? '';
}

/** Czy zwrot ma tłumaczenie w danym języku (do oznaczenia braków). */
export function isTranslated(code: string, lang: Lang): boolean {
  if (lang === 'pl') return true;
  return Boolean(H_EN[code] || P_EN[code]);
}
