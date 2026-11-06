/**
 * Piktogramy GHS wg załącznika V do rozporządzenia CLP (WE) nr 1272/2008.
 * Każdy piktogram to czarny symbol na białym tle w czerwonej ramce rombowej.
 * SVG osadzone inline — dokument renderuje się bez zależności zewnętrznych,
 * co jest istotne przy eksporcie do PDF i archiwizacji.
 */

export interface PictogramData {
  code: string;
  namePl: string;
  descriptionPl: string;
  svg: string;
}

/** Wspólna ramka rombowa (czerwony kant, białe wnętrze). */
const frame = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img">
  <g transform="rotate(45 50 50)">
    <rect x="16" y="16" width="68" height="68" fill="#fff" stroke="#e30613" stroke-width="7" rx="3"/>
  </g>
  <g fill="#000">${inner}</g>
</svg>`;

export const PICTOGRAMS: PictogramData[] = [
  {
    code: 'GHS01',
    namePl: 'Materiały wybuchowe',
    descriptionPl: 'Substancje i mieszaniny wybuchowe, samoreaktywne, nadtlenki organiczne',
    svg: frame(`
      <circle cx="50" cy="57" r="13"/>
      <path d="M50 44 L53 34 L49 36 L52 26"  stroke="#000" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M62 45 l9-7 M38 45 l-9-7 M66 57 l11-2 M34 57 l-11-2 M60 68 l8 8 M40 68 l-8 8" stroke="#000" stroke-width="2.6" stroke-linecap="round"/>
    `),
  },
  {
    code: 'GHS02',
    namePl: 'Substancje łatwopalne',
    descriptionPl: 'Substancje i mieszaniny łatwopalne, samonagrzewające się, piroforyczne',
    svg: frame(`
      <path d="M50 22 c4 12 -2 16 -6 22 c-4 6 -6 11 -4 17 c-5 -3 -7 -8 -7 -13 c-6 7 -8 14 -8 20 c0 12 11 21 25 21 s25 -9 25 -21 c0 -14 -12 -21 -16 -30 c-3 -7 -4 -12 -9 -16 z"/>
      <rect x="24" y="76" width="52" height="4" rx="2"/>
    `),
  },
  {
    code: 'GHS03',
    namePl: 'Substancje utleniające',
    descriptionPl: 'Gazy, ciecze i ciała stałe o właściwościach utleniających',
    svg: frame(`
      <circle cx="50" cy="60" r="17" fill="none" stroke="#000" stroke-width="5"/>
      <path d="M50 20 c3 9 -1 12 -4 16 c-3 5 -4 8 -3 13 c-4 -2 -5 -6 -5 -10 c-5 5 -6 11 -6 15 h29 c1 -10 -8 -16 -11 -22 c-2 -5 -3 -9 -6 -12 z"/>
      <rect x="24" y="80" width="52" height="4" rx="2"/>
    `),
  },
  {
    code: 'GHS04',
    namePl: 'Gazy pod ciśnieniem',
    descriptionPl: 'Gazy sprężone, skroplone, schłodzone i rozpuszczone',
    svg: frame(`
      <rect x="38" y="30" width="24" height="48" rx="10" fill="none" stroke="#000" stroke-width="5"/>
      <rect x="45" y="22" width="10" height="10" rx="2"/>
      <path d="M38 46 h24" stroke="#000" stroke-width="4"/>
    `),
  },
  {
    code: 'GHS05',
    namePl: 'Działanie żrące',
    descriptionPl: 'Powoduje korozję metali, poważne oparzenia skóry i uszkodzenie oczu',
    svg: frame(`
      <path d="M24 34 l12 6 v10 l-10 12 z"/>
      <path d="M30 44 q6 12 6 20" stroke="#000" stroke-width="2.5" fill="none"/>
      <rect x="18" y="66" width="26" height="4"/>
      <path d="M62 32 l14 6 v10 l-12 14 z"/>
      <rect x="56" y="66" width="28" height="4"/>
      <path d="M64 76 q6 -6 12 0" stroke="#000" stroke-width="2.5" fill="none"/>
      <circle cx="70" cy="72" r="2"/><circle cx="34" cy="72" r="2"/>
    `),
  },
  {
    code: 'GHS06',
    namePl: 'Toksyczność ostra',
    descriptionPl: 'Substancje o toksyczności ostrej kategorii 1–3 — działa toksycznie',
    svg: frame(`
      <path d="M50 26 c-11 0 -19 8 -19 18 c0 6 3 10 6 13 v6 h26 v-6 c3 -3 6 -7 6 -13 c0 -10 -8 -18 -19 -18 z" fill="#000"/>
      <circle cx="43" cy="43" r="4" fill="#fff"/><circle cx="57" cy="43" r="4" fill="#fff"/>
      <path d="M47 53 h6 M45 57 h10" stroke="#fff" stroke-width="2"/>
      <path d="M30 68 l40 14 M70 68 l-40 14" stroke="#000" stroke-width="5" stroke-linecap="round"/>
    `),
  },
  {
    code: 'GHS07',
    namePl: 'Działanie szkodliwe / drażniące',
    descriptionPl: 'Działanie drażniące, uczulające na skórę, szkodliwe, STOT jednorazowe kat. 3',
    svg: frame(`
      <path d="M45 28 h10 l-2 32 h-6 z"/>
      <circle cx="50" cy="70" r="6"/>
    `),
  },
  {
    code: 'GHS08',
    namePl: 'Poważne zagrożenie dla zdrowia',
    descriptionPl: 'Rakotwórczość, mutagenność, działanie na rozrodczość, uczulenie dróg oddechowych, STOT, aspiracja',
    svg: frame(`
      <path d="M50 24 c-10 0 -18 6 -18 14 v20 c0 12 8 20 18 20 s18 -8 18 -20 v-20 c0 -8 -8 -14 -18 -14 z" fill="none" stroke="#000" stroke-width="4"/>
      <path d="M39 40 h22 M39 52 h22" stroke="#000" stroke-width="3"/>
      <path d="M56 30 l14 -8 M60 36 l16 -4" stroke="#000" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="64" r="6"/>
    `),
  },
  {
    code: 'GHS09',
    namePl: 'Zagrożenie dla środowiska',
    descriptionPl: 'Stwarzające zagrożenie dla środowiska wodnego — ostre i przewlekłe',
    svg: frame(`
      <path d="M20 74 h60" stroke="#000" stroke-width="3.5"/>
      <path d="M30 70 c8 -4 14 -12 14 -22 c0 -6 -2 -10 -5 -13 c5 1 9 4 11 8 c2 -6 1 -12 -3 -17 c8 3 13 11 13 20 c0 14 -12 24 -30 24 z"/>
      <path d="M56 62 c6 -3 14 -2 20 3 c-5 5 -13 6 -20 3 z"/>
      <path d="M76 65 l6 -4 v8 z"/>
      <circle cx="61" cy="64" r="1.6" fill="#fff"/>
    `),
  },
];

export const PICTOGRAM_BY_CODE = new Map(PICTOGRAMS.map((p) => [p.code, p]));
