/**
 * Pakiet wiedzy fotochemicznej (A3) — gotowe treści domenowe do wstawienia
 * w odpowiednich sekcjach. Chemik może je wstawić jednym kliknięciem i dostosować.
 *
 * Wartości pasują do typów pól z sections.ts (string dla textarea, string[] dla list).
 */

export interface Preset {
  section: number;
  fieldKey: string;
  label: string;
  value: string | string[];
}

export const PHOTOCHEM_PRESETS: Preset[] = [
  // ── Sekcja 5: pożar ──
  {
    section: 5,
    fieldKey: 'zagrozenia',
    label: 'Wywoływacz proszkowy — produkty spalania',
    value:
      'Produkt nie jest łatwopalny. W warunkach pożaru lub w kontakcie z kwasami możliwe wydzielanie toksycznego dwutlenku siarki (SO₂) oraz tlenków siarki, azotu i węgla. Pył organiczny w odpowiednim stężeniu w powietrzu może tworzyć mieszaniny wybuchowe.',
  },

  // ── Sekcja 7: postępowanie ──
  {
    section: 7,
    fieldKey: 'postepowanie',
    label: 'Praca z proszkami fotochemicznymi',
    value: [
      'Odważać i rozpuszczać proszek przy skutecznej wentylacji miejscowej lub w dygestorium — unikać wzbijania pyłu.',
      'Roztwór roboczy: powoli wsypywać proszek do wody (a nie odwrotnie), mieszając; najpierw rozpuścić część konserwująco-buforującą (siarczyn chroni wywoływacze przed utlenieniem), następnie część wywołującą.',
      'Podczas pracy nie jeść, nie pić, nie palić; po pracy umyć ręce i twarz.',
    ],
  },

  // ── Sekcja 10: stabilność i reaktywność ──
  {
    section: 10,
    fieldKey: 'niebezpieczneReakcje',
    label: 'Siarczyn + kwas → SO₂; utlenianie wywoływaczy',
    value:
      'Siarczyn sodu reaguje z silnymi kwasami mineralnymi, uwalniając toksyczny dwutlenek siarki (SO₂). Hydrochinon i inne wywoływacze utleniają się w kontakcie z powietrzem i światłem (zmiana barwy na brunatną świadczy o utracie aktywności).',
  },
  {
    section: 10,
    fieldKey: 'warunkiDoUnikania',
    label: 'Warunki do unikania (fotochemia)',
    value: 'Dostęp powietrza i światła (utlenianie wywoływaczy), wilgoć, wysoka temperatura, kontakt z kwasami.',
  },
  {
    section: 10,
    fieldKey: 'materialyNiezgodne',
    label: 'Materiały niezgodne (fotochemia)',
    value: 'Silne kwasy mineralne, silne utleniacze, silne zasady, metale alkaliczne, bezwodniki i chlorki kwasowe.',
  },
  {
    section: 10,
    fieldKey: 'produktyRozkladu',
    label: 'Niebezpieczne produkty rozkładu',
    value: 'W warunkach pożaru: tlenki siarki (SO₂, SO₃), tlenki azotu i węgla, chinony (z utleniania wywoływaczy).',
  },

  // ── Sekcja 13: odpady ──
  {
    section: 13,
    fieldKey: 'metody',
    label: 'Odpady fotochemiczne + odzysk srebra',
    value:
      'Nie odprowadzać roztworów wywoływaczy ani utrwalaczy do kanalizacji. Zużyty utrwalacz zawiera srebro — przekazać do odzysku srebra uprawnionemu odbiorcy. Znaczące ilości przekazać jako odpad niebezpieczny. Kody odpadów: 09 01 01* (wodne roztwory wywoływaczy), 09 01 04* (roztwory utrwalaczy), 09 01 06* (osady zawierające srebro).',
  },
];

/** Presety dostępne dla danej sekcji. */
export function presetsForSection(section: number): Preset[] {
  return PHOTOCHEM_PRESETS.filter((p) => p.section === section);
}
