/**
 * Klasy i kategorie zagrożenia wg załącznika I do rozporządzenia CLP.
 * Każdy wpis niesie domyślny zwrot H, piktogram i hasło ostrzegawcze,
 * dzięki czemu wybór klasy w sekcji 2.1 podpowiada oznakowanie w sekcji 2.2.
 */

export interface HazardClassData {
  code: string;
  namePl: string;
  categoryPl: string;
  defaultStatement?: string;
  pictogramCode?: string;
  signalWord?: 'NIEBEZPIECZEŃSTWO' | 'UWAGA';
  sortOrder: number;
}

export const HAZARD_CLASSES: HazardClassData[] = [
  // ── Zagrożenia fizyczne ──
  { code: 'Flam. Liq. 1', namePl: 'Substancje ciekłe łatwopalne', categoryPl: 'Kategoria 1', defaultStatement: 'H224', pictogramCode: 'GHS02', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 100 },
  { code: 'Flam. Liq. 2', namePl: 'Substancje ciekłe łatwopalne', categoryPl: 'Kategoria 2', defaultStatement: 'H225', pictogramCode: 'GHS02', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 101 },
  { code: 'Flam. Liq. 3', namePl: 'Substancje ciekłe łatwopalne', categoryPl: 'Kategoria 3', defaultStatement: 'H226', pictogramCode: 'GHS02', signalWord: 'UWAGA', sortOrder: 102 },
  { code: 'Flam. Sol. 1', namePl: 'Substancje stałe łatwopalne', categoryPl: 'Kategoria 1', defaultStatement: 'H228', pictogramCode: 'GHS02', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 110 },
  { code: 'Flam. Sol. 2', namePl: 'Substancje stałe łatwopalne', categoryPl: 'Kategoria 2', defaultStatement: 'H228', pictogramCode: 'GHS02', signalWord: 'UWAGA', sortOrder: 111 },
  { code: 'Ox. Sol. 1', namePl: 'Substancje stałe utleniające', categoryPl: 'Kategoria 1', defaultStatement: 'H271', pictogramCode: 'GHS03', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 120 },
  { code: 'Ox. Sol. 2', namePl: 'Substancje stałe utleniające', categoryPl: 'Kategoria 2', defaultStatement: 'H272', pictogramCode: 'GHS03', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 121 },
  { code: 'Ox. Sol. 3', namePl: 'Substancje stałe utleniające', categoryPl: 'Kategoria 3', defaultStatement: 'H272', pictogramCode: 'GHS03', signalWord: 'UWAGA', sortOrder: 122 },
  { code: 'Met. Corr. 1', namePl: 'Substancje powodujące korozję metali', categoryPl: 'Kategoria 1', defaultStatement: 'H290', pictogramCode: 'GHS05', signalWord: 'UWAGA', sortOrder: 130 },
  { code: 'Press. Gas', namePl: 'Gazy pod ciśnieniem', categoryPl: '—', defaultStatement: 'H280', pictogramCode: 'GHS04', signalWord: 'UWAGA', sortOrder: 140 },

  // ── Zagrożenia dla zdrowia ──
  { code: 'Acute Tox. 1', namePl: 'Toksyczność ostra (droga pokarmowa)', categoryPl: 'Kategoria 1', defaultStatement: 'H300', pictogramCode: 'GHS06', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 200 },
  { code: 'Acute Tox. 2', namePl: 'Toksyczność ostra (droga pokarmowa)', categoryPl: 'Kategoria 2', defaultStatement: 'H300', pictogramCode: 'GHS06', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 201 },
  { code: 'Acute Tox. 3', namePl: 'Toksyczność ostra (droga pokarmowa)', categoryPl: 'Kategoria 3', defaultStatement: 'H301', pictogramCode: 'GHS06', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 202 },
  { code: 'Acute Tox. 4', namePl: 'Toksyczność ostra (droga pokarmowa)', categoryPl: 'Kategoria 4', defaultStatement: 'H302', pictogramCode: 'GHS07', signalWord: 'UWAGA', sortOrder: 203 },
  { code: 'Skin Corr. 1', namePl: 'Działanie żrące na skórę', categoryPl: 'Kategoria 1', defaultStatement: 'H314', pictogramCode: 'GHS05', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 209 },
  { code: 'Skin Corr. 1A', namePl: 'Działanie żrące na skórę', categoryPl: 'Kategoria 1A', defaultStatement: 'H314', pictogramCode: 'GHS05', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 210 },
  { code: 'Skin Corr. 1B', namePl: 'Działanie żrące na skórę', categoryPl: 'Kategoria 1B', defaultStatement: 'H314', pictogramCode: 'GHS05', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 211 },
  { code: 'Skin Corr. 1C', namePl: 'Działanie żrące na skórę', categoryPl: 'Kategoria 1C', defaultStatement: 'H314', pictogramCode: 'GHS05', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 212 },
  { code: 'Skin Irrit. 2', namePl: 'Działanie drażniące na skórę', categoryPl: 'Kategoria 2', defaultStatement: 'H315', pictogramCode: 'GHS07', signalWord: 'UWAGA', sortOrder: 213 },
  { code: 'Eye Dam. 1', namePl: 'Poważne uszkodzenie oczu', categoryPl: 'Kategoria 1', defaultStatement: 'H318', pictogramCode: 'GHS05', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 220 },
  { code: 'Eye Irrit. 2', namePl: 'Działanie drażniące na oczy', categoryPl: 'Kategoria 2', defaultStatement: 'H319', pictogramCode: 'GHS07', signalWord: 'UWAGA', sortOrder: 221 },
  { code: 'Resp. Sens. 1', namePl: 'Działanie uczulające na drogi oddechowe', categoryPl: 'Kategoria 1', defaultStatement: 'H334', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 230 },
  { code: 'Skin Sens. 1', namePl: 'Działanie uczulające na skórę', categoryPl: 'Kategoria 1', defaultStatement: 'H317', pictogramCode: 'GHS07', signalWord: 'UWAGA', sortOrder: 231 },
  { code: 'Skin Sens. 1A', namePl: 'Działanie uczulające na skórę', categoryPl: 'Kategoria 1A', defaultStatement: 'H317', pictogramCode: 'GHS07', signalWord: 'UWAGA', sortOrder: 232 },
  { code: 'Skin Sens. 1B', namePl: 'Działanie uczulające na skórę', categoryPl: 'Kategoria 1B', defaultStatement: 'H317', pictogramCode: 'GHS07', signalWord: 'UWAGA', sortOrder: 233 },
  { code: 'Muta. 1A', namePl: 'Działanie mutagenne na komórki rozrodcze', categoryPl: 'Kategoria 1A', defaultStatement: 'H340', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 240 },
  { code: 'Muta. 1B', namePl: 'Działanie mutagenne na komórki rozrodcze', categoryPl: 'Kategoria 1B', defaultStatement: 'H340', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 241 },
  { code: 'Muta. 2', namePl: 'Działanie mutagenne na komórki rozrodcze', categoryPl: 'Kategoria 2', defaultStatement: 'H341', pictogramCode: 'GHS08', signalWord: 'UWAGA', sortOrder: 242 },
  { code: 'Carc. 1A', namePl: 'Rakotwórczość', categoryPl: 'Kategoria 1A', defaultStatement: 'H350', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 250 },
  { code: 'Carc. 1B', namePl: 'Rakotwórczość', categoryPl: 'Kategoria 1B', defaultStatement: 'H350', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 251 },
  { code: 'Carc. 2', namePl: 'Rakotwórczość', categoryPl: 'Kategoria 2', defaultStatement: 'H351', pictogramCode: 'GHS08', signalWord: 'UWAGA', sortOrder: 252 },
  { code: 'Repr. 1A', namePl: 'Działanie szkodliwe na rozrodczość', categoryPl: 'Kategoria 1A', defaultStatement: 'H360', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 260 },
  { code: 'Repr. 1B', namePl: 'Działanie szkodliwe na rozrodczość', categoryPl: 'Kategoria 1B', defaultStatement: 'H360', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 261 },
  { code: 'Repr. 2', namePl: 'Działanie szkodliwe na rozrodczość', categoryPl: 'Kategoria 2', defaultStatement: 'H361', pictogramCode: 'GHS08', signalWord: 'UWAGA', sortOrder: 262 },
  { code: 'Lact.', namePl: 'Szkodliwe działanie na dzieci karmione piersią', categoryPl: 'Dodatkowa', defaultStatement: 'H362', sortOrder: 263 },
  { code: 'STOT SE 1', namePl: 'Działanie toksyczne na narządy docelowe — narażenie jednorazowe', categoryPl: 'Kategoria 1', defaultStatement: 'H370', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 270 },
  { code: 'STOT SE 2', namePl: 'Działanie toksyczne na narządy docelowe — narażenie jednorazowe', categoryPl: 'Kategoria 2', defaultStatement: 'H371', pictogramCode: 'GHS08', signalWord: 'UWAGA', sortOrder: 271 },
  { code: 'STOT SE 3', namePl: 'Działanie toksyczne na narządy docelowe — narażenie jednorazowe', categoryPl: 'Kategoria 3', defaultStatement: 'H335', pictogramCode: 'GHS07', signalWord: 'UWAGA', sortOrder: 272 },
  { code: 'STOT RE 1', namePl: 'Działanie toksyczne na narządy docelowe — narażenie powtarzane', categoryPl: 'Kategoria 1', defaultStatement: 'H372', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 280 },
  { code: 'STOT RE 2', namePl: 'Działanie toksyczne na narządy docelowe — narażenie powtarzane', categoryPl: 'Kategoria 2', defaultStatement: 'H373', pictogramCode: 'GHS08', signalWord: 'UWAGA', sortOrder: 281 },
  { code: 'Asp. Tox. 1', namePl: 'Zagrożenie spowodowane aspiracją', categoryPl: 'Kategoria 1', defaultStatement: 'H304', pictogramCode: 'GHS08', signalWord: 'NIEBEZPIECZEŃSTWO', sortOrder: 290 },

  // ── Zagrożenia dla środowiska ──
  { code: 'Aquatic Acute 1', namePl: 'Stwarzające zagrożenie dla środowiska wodnego — zagrożenie ostre', categoryPl: 'Kategoria 1', defaultStatement: 'H400', pictogramCode: 'GHS09', signalWord: 'UWAGA', sortOrder: 300 },
  { code: 'Aquatic Chronic 1', namePl: 'Stwarzające zagrożenie dla środowiska wodnego — zagrożenie przewlekłe', categoryPl: 'Kategoria 1', defaultStatement: 'H410', pictogramCode: 'GHS09', signalWord: 'UWAGA', sortOrder: 310 },
  { code: 'Aquatic Chronic 2', namePl: 'Stwarzające zagrożenie dla środowiska wodnego — zagrożenie przewlekłe', categoryPl: 'Kategoria 2', defaultStatement: 'H411', pictogramCode: 'GHS09', sortOrder: 311 },
  { code: 'Aquatic Chronic 3', namePl: 'Stwarzające zagrożenie dla środowiska wodnego — zagrożenie przewlekłe', categoryPl: 'Kategoria 3', defaultStatement: 'H412', sortOrder: 312 },
  { code: 'Aquatic Chronic 4', namePl: 'Stwarzające zagrożenie dla środowiska wodnego — zagrożenie przewlekłe', categoryPl: 'Kategoria 4', defaultStatement: 'H413', sortOrder: 313 },
  { code: 'Ozone 1', namePl: 'Stwarzające zagrożenie dla warstwy ozonowej', categoryPl: 'Kategoria 1', defaultStatement: 'H420', pictogramCode: 'GHS07', signalWord: 'UWAGA', sortOrder: 320 },
];

export const HAZARD_CLASS_BY_CODE = new Map(HAZARD_CLASSES.map((h) => [h.code, h]));

/** Kolejność ważności haseł ostrzegawczych — NIEBEZPIECZEŃSTWO wypiera UWAGA. */
export function strongestSignalWord(codes: string[]): string | null {
  let hasWarning = false;
  for (const c of codes) {
    const hc = HAZARD_CLASS_BY_CODE.get(c);
    if (hc?.signalWord === 'NIEBEZPIECZEŃSTWO') return 'NIEBEZPIECZEŃSTWO';
    if (hc?.signalWord === 'UWAGA') hasWarning = true;
  }
  return hasWarning ? 'UWAGA' : null;
}

/** Zbiera unikalne piktogramy wynikające z wybranych klas zagrożenia. */
export function pictogramsForClasses(codes: string[]): string[] {
  const set = new Set<string>();
  for (const c of codes) {
    const p = HAZARD_CLASS_BY_CODE.get(c)?.pictogramCode;
    if (p) set.add(p);
  }
  return [...set].sort();
}

/** Zbiera domyślne zwroty H wynikające z wybranych klas zagrożenia. */
export function statementsForClasses(codes: string[]): string[] {
  const set = new Set<string>();
  for (const c of codes) {
    const s = HAZARD_CLASS_BY_CODE.get(c)?.defaultStatement;
    if (s) set.add(s);
  }
  return [...set].sort();
}
