/**
 * Dane startowe: substancje, mieszaniny i produkty z arkusza „Chemikalia”
 * (Google Sheets 16Eypx5OmFfv5kAoJsojP9qIXfeDIRFKNq4CmszgEkbk, stan: 2026-11).
 *
 * ⚠️ Identyfikatory WE/indeksowe i klasy zagrożenia podano tylko tam, gdzie
 * wpis zharmonizowany (zał. VI CLP) jest jednoznaczny. Wszystkie substancje
 * trafiają do bazy jako „niezweryfikowane” — chemik zatwierdza je w aplikacji.
 * Seed nie nadpisuje danych już istniejących w bazie (upsert tylko „create”).
 */

export interface SeedHazard {
  hazardClass: string;
  statement?: string;
  sclMin?: number;
  sclStatement?: string;
  mFactorAcute?: number;
  mFactorChronic?: number;
  ateOral?: number;
  /** Wpis wyłącznie graniczny (SCL) — nie klasa samej substancji */
  limitOnly?: boolean;
  note?: string;
}

export interface SeedSubstance {
  cas: string;
  name: string;
  nameEn: string;
  ecNumber?: string;
  indexNumber?: string;
  reachNumber?: string;
  molecularFormula?: string;
  molarMass?: string;
  density?: number;
  isSvhc?: boolean;
  sclNotes?: string;
  notes?: string;
  exposureLimits?: Record<string, string>;
  hazards?: SeedHazard[];
  /** Zweryfikowane wcześniej (karty D-76) */
  verified?: boolean;
}

const ANNEX_VI = 'wstępnie wg zał. VI CLP — do weryfikacji';

/** SCL mocnych zasad (NaOH, KOH) wg zał. VI: 1A ≥ 5 %; 1B 2–5 %; Skin/Eye Irrit. 2: 0,5–2 %. */
const CAUSTIC_LIMITS: SeedHazard[] = [
  { hazardClass: 'Skin Corr. 1A', statement: 'H314', sclMin: 5, note: `${ANNEX_VI}; C ≥ 5 %` },
  { hazardClass: 'Skin Corr. 1B', statement: 'H314', sclMin: 2, limitOnly: true, note: '2 % ≤ C < 5 %' },
  { hazardClass: 'Skin Irrit. 2', statement: 'H315', sclMin: 0.5, limitOnly: true, note: '0,5 % ≤ C < 2 %' },
  { hazardClass: 'Eye Irrit. 2', statement: 'H319', sclMin: 0.5, limitOnly: true, note: '0,5 % ≤ C < 2 %' },
];

export const SUBSTANCES: SeedSubstance[] = [
  // ── zweryfikowane przy kartach D-76 ──
  {
    cas: '123-31-9',
    name: 'Hydrochinon',
    nameEn: 'Hydroquinone',
    ecNumber: '204-617-8',
    indexNumber: '604-005-00-4',
    molecularFormula: 'C6H4(OH)2',
    molarMass: '110,11 g/mol',
    sclNotes: 'M = 10',
    exposureLimits: { nds: '1', ndsch: '2', ndsp: '', uwagi: '' },
    verified: true,
    hazards: [
      { hazardClass: 'Acute Tox. 4', statement: 'H302', ateOral: 320 },
      { hazardClass: 'Skin Sens. 1', statement: 'H317' },
      { hazardClass: 'Eye Dam. 1', statement: 'H318' },
      { hazardClass: 'Muta. 2', statement: 'H341' },
      { hazardClass: 'Carc. 2', statement: 'H351' },
      { hazardClass: 'Aquatic Acute 1', statement: 'H400', mFactorAcute: 10 },
    ],
  },
  {
    cas: '55-55-0',
    name: 'Siarczan(VI) bis(4-hydroksy-N-metyloanilinium) (metol)',
    nameEn: 'Metol (4-methylaminophenol sulfate)',
    ecNumber: '200-237-1',
    indexNumber: '650-031-00-4',
    molecularFormula: '(C7H10NO)2SO4',
    molarMass: '344,38 g/mol',
    verified: true,
    hazards: [
      { hazardClass: 'Acute Tox. 4', statement: 'H302', ateOral: 565 },
      { hazardClass: 'Skin Sens. 1', statement: 'H317' },
      { hazardClass: 'STOT RE 2', statement: 'H373' },
      { hazardClass: 'Aquatic Acute 1', statement: 'H400', mFactorAcute: 1 },
      { hazardClass: 'Aquatic Chronic 1', statement: 'H410', mFactorChronic: 1 },
    ],
  },
  {
    cas: '7757-83-7',
    name: 'Siarczyn sodu bezwodny',
    nameEn: 'Sodium sulfite',
    ecNumber: '231-821-4',
    reachNumber: '01-2119537420-49-XXXX',
    molecularFormula: 'Na2SO3',
    molarMass: '126,04 g/mol',
    verified: true,
  },
  {
    cas: '1303-96-4',
    name: 'di-Sodu tetraboran 10-hydrat (boraks)',
    nameEn: 'Disodium tetraborate decahydrate (borax)',
    ecNumber: '215-540-4',
    indexNumber: '005-011-01-1',
    reachNumber: '01-2119490790-32-XXXX',
    molecularFormula: 'Na2B4O7 · 10H2O',
    molarMass: '381,37 g/mol',
    isSvhc: true,
    sclNotes: 'Repr. 1B, H360FD: C ≥ 8,5 %',
    exposureLimits: { nds: '0,5', ndsch: '2', ndsp: '', uwagi: 'frakcja wdychalna' },
    verified: true,
    hazards: [{ hazardClass: 'Repr. 1B', statement: 'H360FD', sclMin: 8.5, sclStatement: 'H360FD' }],
  },

  // ── z arkusza „Chemikalia” ──
  {
    cas: '12125-02-9',
    name: 'Chlorek amonu',
    nameEn: 'Ammonium chloride',
    ecNumber: '235-186-4',
    indexNumber: '017-014-00-8',
    molecularFormula: 'NH4Cl',
    molarMass: '53,49 g/mol',
    hazards: [
      { hazardClass: 'Acute Tox. 4', statement: 'H302', note: ANNEX_VI },
      { hazardClass: 'Eye Irrit. 2', statement: 'H319', note: ANNEX_VI },
    ],
  },
  {
    cas: '7783-18-8',
    name: 'Tiosiarczan amonu',
    nameEn: 'Ammonium thiosulfate',
    ecNumber: '231-982-0',
    molecularFormula: '(NH4)2S2O3',
    molarMass: '148,21 g/mol',
    notes: 'W recepturach jako sól stała; często dostępny też jako roztwór 57–60 %.',
  },
  {
    cas: '50-81-7',
    name: 'Kwas L-askorbinowy',
    nameEn: 'Ascorbic acid',
    ecNumber: '200-066-2',
    molecularFormula: 'C6H8O6',
    molarMass: '176,12 g/mol',
  },
  {
    cas: '10043-35-3',
    name: 'Kwas borowy',
    nameEn: 'Boric acid',
    ecNumber: '233-139-2',
    indexNumber: '005-007-00-2',
    molecularFormula: 'H3BO3',
    molarMass: '61,83 g/mol',
    isSvhc: true,
    sclNotes: 'Repr. 1B, H360FD: C ≥ 5,5 %',
    hazards: [{ hazardClass: 'Repr. 1B', statement: 'H360FD', sclMin: 5.5, sclStatement: 'H360FD', note: ANNEX_VI }],
  },
  {
    cas: '25646-71-3',
    name: 'Siarczan N-[2-(4-amino-N-etylo-m-toluidyno)etylo]metanosulfonamidu (CD-3)',
    nameEn: 'CD-3 colour developing agent',
    molecularFormula: 'C12H21N3O2S · 1,5 H2SO4 · H2O',
    molarMass: '436,52 g/mol',
    notes: 'Klasyfikację zharmonizowaną (zał. VI CLP) pobierz na stronie substancji: „Pobierz dane z PubChem”.',
  },
  {
    cas: '25646-77-9',
    name: 'Siarczan 4-(N-etylo-N-2-hydroksyetylo)-2-metylofenylenodiaminy (CD-4)',
    nameEn: 'CD-4 colour developing agent',
    molecularFormula: 'C11H18N2O · H2SO4',
    molarMass: '292,35 g/mol',
    notes: 'Klasyfikację zharmonizowaną (zał. VI CLP) pobierz na stronie substancji: „Pobierz dane z PubChem”.',
  },
  {
    cas: '77-92-9',
    name: 'Kwas cytrynowy bezwodny',
    nameEn: 'Citric acid',
    ecNumber: '201-069-1',
    molecularFormula: 'C6H8O7',
    molarMass: '192,12 g/mol',
  },
  {
    cas: '6381-92-6',
    name: 'Wersenian disodu, dihydrat (Na2EDTA)',
    nameEn: 'Disodium EDTA dihydrate',
    molecularFormula: 'C10H14N2Na2O8 · 2H2O',
    molarMass: '372,24 g/mol',
    notes: 'Arkusz podaje „EDTA” — przyjęto sól disodową (typową w utrwalaczach). Sprawdź postać u dostawcy.',
  },
  {
    cas: '100-97-0',
    name: 'Heksametylenotetramina (urotropina)',
    nameEn: 'Hexamethylenetetramine (HMTA)',
    ecNumber: '202-905-8',
    molecularFormula: 'C6H12N4',
    molarMass: '140,19 g/mol',
  },
  {
    cas: '10039-54-0',
    name: 'Siarczan hydroksyloaminy',
    nameEn: 'Hydroxylamine sulfate',
    ecNumber: '233-118-8',
    molecularFormula: '(NH2OH)2 · H2SO4',
    molarMass: '164,14 g/mol',
  },
  {
    cas: '92-43-3',
    name: '1-Fenylo-3-pirazolidynon (fenidon)',
    nameEn: 'Phenidone',
    ecNumber: '202-155-2',
    molecularFormula: 'C9H10N2O',
    molarMass: '162,19 g/mol',
  },
  {
    cas: '584-08-7',
    name: 'Węglan potasu',
    nameEn: 'Potassium carbonate',
    ecNumber: '209-529-3',
    molecularFormula: 'K2CO3',
    molarMass: '138,21 g/mol',
  },
  {
    cas: '13746-66-2',
    name: 'Heksacyjanożelazian(III) potasu (żelazicyjanek potasu)',
    nameEn: 'Potassium ferricyanide',
    ecNumber: '237-323-3',
    molecularFormula: 'K3[Fe(CN)6]',
    molarMass: '329,24 g/mol',
  },
  {
    cas: '1310-58-3',
    name: 'Wodorotlenek potasu',
    nameEn: 'Potassium hydroxide',
    ecNumber: '215-181-3',
    indexNumber: '019-002-00-8',
    molecularFormula: 'KOH',
    molarMass: '56,11 g/mol',
    sclNotes: 'Skin Corr. 1A: C ≥ 5 %; 1B: 2–5 %; Skin Irrit. 2 / Eye Irrit. 2: 0,5–2 %',
    hazards: [
      { hazardClass: 'Acute Tox. 4', statement: 'H302', note: ANNEX_VI },
      ...CAUSTIC_LIMITS,
    ],
  },
  {
    cas: '7681-11-0',
    name: 'Jodek potasu',
    nameEn: 'Potassium iodide',
    ecNumber: '231-659-4',
    molecularFormula: 'KI',
    molarMass: '166,00 g/mol',
  },
  {
    cas: '7722-64-7',
    name: 'Manganian(VII) potasu',
    nameEn: 'Potassium permanganate',
    ecNumber: '231-760-3',
    molecularFormula: 'KMnO4',
    molarMass: '158,03 g/mol',
    notes: 'W arkuszu jako roztwór 4 % — w recepturze podaj substancję i wodę osobno.',
  },
  {
    cas: '87-66-1',
    name: 'Pirogalol (benzeno-1,2,3-triol)',
    nameEn: 'Pyrogallol',
    ecNumber: '201-762-9',
    molecularFormula: 'C6H3(OH)3',
    molarMass: '126,11 g/mol',
  },
  {
    cas: '144-55-8',
    name: 'Wodorowęglan sodu',
    nameEn: 'Sodium bicarbonate',
    ecNumber: '205-633-8',
    molecularFormula: 'NaHCO3',
    molarMass: '84,01 g/mol',
  },
  {
    cas: '7647-15-6',
    name: 'Bromek sodu',
    nameEn: 'Sodium bromide',
    ecNumber: '231-599-9',
    molecularFormula: 'NaBr',
    molarMass: '102,89 g/mol',
  },
  {
    cas: '7758-02-3',
    name: 'Bromek potasu',
    nameEn: 'Potassium bromide',
    ecNumber: '231-830-3',
    molecularFormula: 'KBr',
    molarMass: '119,00 g/mol',
  },
  {
    cas: '497-19-8',
    name: 'Węglan sodu bezwodny',
    nameEn: 'Sodium carbonate',
    ecNumber: '207-838-8',
    indexNumber: '011-005-00-2',
    molecularFormula: 'Na2CO3',
    molarMass: '105,99 g/mol',
    hazards: [{ hazardClass: 'Eye Irrit. 2', statement: 'H319', note: ANNEX_VI }],
  },
  {
    cas: '1310-73-2',
    name: 'Wodorotlenek sodu',
    nameEn: 'Sodium hydroxide',
    ecNumber: '215-185-5',
    indexNumber: '011-002-00-6',
    molecularFormula: 'NaOH',
    molarMass: '40,00 g/mol',
    sclNotes: 'Skin Corr. 1A: C ≥ 5 %; 1B: 2–5 %; Skin Irrit. 2 / Eye Irrit. 2: 0,5–2 %',
    hazards: CAUSTIC_LIMITS,
  },
  {
    cas: '7681-57-4',
    name: 'Disiarczan(IV) sodu (pirosiarczyn sodu)',
    nameEn: 'Sodium metabisulfite',
    ecNumber: '231-673-0',
    indexNumber: '016-063-00-2',
    molecularFormula: 'Na2S2O5',
    molarMass: '190,11 g/mol',
    notes: 'Wpis zharmonizowany zawiera także EUH031.',
    hazards: [
      { hazardClass: 'Acute Tox. 4', statement: 'H302', note: ANNEX_VI },
      { hazardClass: 'Eye Dam. 1', statement: 'H318', note: ANNEX_VI },
    ],
  },
  {
    cas: '7757-82-6',
    name: 'Siarczan sodu bezwodny',
    nameEn: 'Sodium sulfate',
    ecNumber: '231-820-9',
    molecularFormula: 'Na2SO4',
    molarMass: '142,04 g/mol',
  },
  {
    cas: '10102-17-7',
    name: 'Tiosiarczan sodu, 5-hydrat',
    nameEn: 'Sodium thiosulfate pentahydrate',
    molecularFormula: 'Na2S2O3 · 5H2O',
    molarMass: '248,18 g/mol',
    notes: 'Arkusz: „tiosiarczan sodu” — przyjęto pentahydrat (postać handlowa). Nr WE 231-867-5 dotyczy soli bezwodnej (7772-98-7).',
  },
  {
    cas: '7664-93-9',
    name: 'Kwas siarkowy(VI)',
    nameEn: 'Sulfuric acid',
    ecNumber: '231-639-5',
    indexNumber: '016-020-00-8',
    molecularFormula: 'H2SO4',
    molarMass: '98,08 g/mol',
    density: 1.84,
    sclNotes: 'Skin Corr. 1A: C ≥ 15 %; Skin Irrit. 2 / Eye Irrit. 2: 5–15 %',
    notes: 'W arkuszu jako roztwór 10 % — w recepturze podaj substancję i wodę osobno.',
    hazards: [
      { hazardClass: 'Skin Corr. 1A', statement: 'H314', sclMin: 15, note: `${ANNEX_VI}; C ≥ 15 %` },
      { hazardClass: 'Skin Irrit. 2', statement: 'H315', sclMin: 5, limitOnly: true, note: '5 % ≤ C < 15 %' },
      { hazardClass: 'Eye Irrit. 2', statement: 'H319', sclMin: 5, limitOnly: true, note: '5 % ≤ C < 15 %' },
    ],
  },
  {
    cas: '10025-69-1',
    name: 'Chlorek cyny(II), 2-hydrat',
    nameEn: 'Tin(II) chloride dihydrate',
    molecularFormula: 'SnCl2 · 2H2O',
    molarMass: '225,65 g/mol',
    notes: 'Przyjęto dihydrat (postać handlowa). Nr WE 231-868-0 dotyczy soli bezwodnej (7772-99-8).',
  },
  {
    cas: '121-44-8',
    name: 'Trietyloamina',
    nameEn: 'Triethylamine',
    ecNumber: '204-469-4',
    molecularFormula: 'N(C2H5)3',
    molarMass: '101,19 g/mol',
    density: 0.726,
    notes: 'Ciecz łatwopalna i żrąca — przed wydaniem karty Pyro 510 pobierz klasyfikację zał. VI CLP („Pobierz dane z PubChem”).',
  },
  {
    cas: '95-14-7',
    name: '1H-Benzotriazol',
    nameEn: 'Benzotriazole',
    ecNumber: '202-394-1',
    molecularFormula: 'C6H5N3',
    molarMass: '119,12 g/mol',
  },
  {
    cas: '7732-18-5',
    name: 'Woda',
    nameEn: 'Water',
    ecNumber: '231-791-2',
    molecularFormula: 'H2O',
    molarMass: '18,02 g/mol',
    density: 1,
  },
];

export interface SeedMixture {
  code: string;
  name: string;
  description?: string;
  form: 'POWDER' | 'LIQUID';
  basisVolumeMl: number;
  notes?: string;
  /** Etykiety opakowań; pusta tablica = jedno opakowanie */
  packets: { label: string; name: string }[];
  components: { cas: string; packet?: string; quantity: number; unit?: 'g' | 'ml'; note?: string }[];
  variants: number[];
  dilutions?: { name: string; waterMl: number }[];
}

export const MIXTURES: SeedMixture[] = [
  {
    code: 'ECN2-PREBATH',
    name: 'ECN-2 — kąpiel wstępna',
    form: 'POWDER',
    basisVolumeMl: 1000,
    packets: [],
    components: [
      { cas: '1303-96-4', quantity: 20 },
      { cas: '7757-82-6', quantity: 100 },
      { cas: '1310-73-2', quantity: 1 },
    ],
    variants: [1000, 500],
  },
  {
    code: 'ECN2-DEV',
    name: 'ECN-2 — wywoływacz barwny',
    form: 'POWDER',
    basisVolumeMl: 1000,
    packets: [],
    components: [
      { cas: '7757-83-7', quantity: 2 },
      { cas: '7647-15-6', quantity: 1.2 },
      { cas: '25646-71-3', quantity: 4 },
      { cas: '497-19-8', quantity: 25.6 },
      { cas: '144-55-8', quantity: 2.7 },
    ],
    variants: [1000, 500],
  },
  {
    code: 'ECN2-BLEACH',
    name: 'ECN-2 — wybielacz',
    form: 'POWDER',
    basisVolumeMl: 1000,
    packets: [],
    components: [
      { cas: '13746-66-2', quantity: 40 },
      { cas: '7647-15-6', quantity: 25 },
    ],
    variants: [1000, 500],
  },
  {
    code: 'ECN2-FIX',
    name: 'ECN-2 — utrwalacz',
    form: 'POWDER',
    basisVolumeMl: 1000,
    packets: [],
    components: [
      { cas: '7783-18-8', quantity: 110 },
      { cas: '7757-83-7', quantity: 10 },
      { cas: '7681-57-4', quantity: 8.4 },
    ],
    variants: [1000, 500],
  },
  {
    code: 'D76',
    name: 'Wywoływacz D-76',
    description: 'Klasyczny wywoływacz negatywowy metol–hydrochinon (Kodak D-76).',
    form: 'POWDER',
    basisVolumeMl: 1000,
    packets: [
      { label: 'A', name: 'część A' },
      { label: 'B', name: 'część B' },
    ],
    components: [
      { cas: '55-55-0', packet: 'A', quantity: 2 },
      { cas: '123-31-9', packet: 'A', quantity: 5 },
      { cas: '7757-83-7', packet: 'B', quantity: 100 },
      { cas: '1303-96-4', packet: 'B', quantity: 2 },
    ],
    variants: [1000, 500],
  },
  {
    code: 'C41-DEV',
    name: 'C-41 — wywoływacz barwny',
    form: 'POWDER',
    basisVolumeMl: 1000,
    notes: 'pH 10,16 przy 25 °C. Jodek potasu bez oznaczenia części w arkuszu — przypisano do części B (do weryfikacji).',
    packets: [
      { label: 'A', name: 'część A' },
      { label: 'B', name: 'część B' },
      { label: 'C', name: 'część C' },
    ],
    components: [
      { cas: '584-08-7', packet: 'A', quantity: 34.3 },
      { cas: '144-55-8', packet: 'A', quantity: 1.95 },
      { cas: '7757-83-7', packet: 'B', quantity: 0.38 },
      { cas: '7681-57-4', packet: 'B', quantity: 2.78 },
      { cas: '7758-02-3', packet: 'B', quantity: 1.5 },
      { cas: '10039-54-0', packet: 'B', quantity: 2.41 },
      { cas: '7681-11-0', packet: 'B', quantity: 0.0012, note: 'przypisanie do części do weryfikacji' },
      { cas: '25646-77-9', packet: 'C', quantity: 4.52 },
    ],
    variants: [1000, 500],
  },
  {
    code: 'C41-BLEACH',
    name: 'C-41 — wybielacz',
    form: 'POWDER',
    basisVolumeMl: 1000,
    packets: [],
    components: [
      { cas: '13746-66-2', quantity: 80 },
      { cas: '7758-02-3', quantity: 20 },
    ],
    variants: [1000, 500],
  },
  {
    code: 'C41-FIX',
    name: 'C-41 — utrwalacz (v2)',
    form: 'POWDER',
    basisVolumeMl: 1000,
    notes: 'pH 6,5 przy 25 °C (korekta KOH / kwasem octowym).',
    packets: [],
    components: [
      { cas: '10102-17-7', quantity: 200 },
      { cas: '6381-92-6', quantity: 1.25 },
      { cas: '7757-83-7', quantity: 24 },
      { cas: '7681-57-4', quantity: 11.32 },
      { cas: '1310-58-3', quantity: 2.4 },
    ],
    variants: [1000, 500],
  },
  {
    code: 'FIX-ATS',
    name: 'Utrwalacz szybki (tiosiarczan amonu)',
    form: 'POWDER',
    basisVolumeMl: 1000,
    packets: [],
    components: [
      { cas: '7783-18-8', quantity: 96 },
      { cas: '6381-92-6', quantity: 1 },
      { cas: '1310-73-2', quantity: 2.5 },
      { cas: '7681-57-4', quantity: 12 },
    ],
    variants: [1000, 500],
  },
  {
    code: 'PYRO510',
    name: 'Pyro 510 — koncentrat',
    description: 'Wywoływacz pirogalolowy w trietyloaminie (koncentrat ciekły).',
    form: 'LIQUID',
    basisVolumeMl: 100,
    packets: [],
    components: [
      { cas: '121-44-8', quantity: 100, unit: 'ml' },
      { cas: '50-81-7', quantity: 5 },
      { cas: '87-66-1', quantity: 10 },
      { cas: '92-43-3', quantity: 0.375 },
    ],
    variants: [100],
  },
  {
    code: 'D96',
    name: 'Wywoływacz D-96',
    form: 'POWDER',
    basisVolumeMl: 1000,
    packets: [],
    components: [
      { cas: '55-55-0', quantity: 1.5 },
      { cas: '7757-83-7', quantity: 75 },
      { cas: '123-31-9', quantity: 1.5 },
      { cas: '7758-02-3', quantity: 0.4 },
      { cas: '1303-96-4', quantity: 4.5 },
    ],
    variants: [1000],
  },
  {
    code: 'ID68',
    name: 'Wywoływacz ID-68',
    form: 'POWDER',
    basisVolumeMl: 1000,
    packets: [],
    components: [
      { cas: '92-43-3', quantity: 0.13 },
      { cas: '7757-83-7', quantity: 85 },
      { cas: '123-31-9', quantity: 5 },
      { cas: '7758-02-3', quantity: 1 },
      { cas: '1303-96-4', quantity: 7 },
      { cas: '10043-35-3', quantity: 2 },
    ],
    variants: [1000],
  },
  {
    code: 'FX37',
    name: 'Wywoływacz FX-37',
    description: 'Wywoływacz fenidon–hydrochinon (Crawley); czasy podawane dla rozcieńczenia 1+3 w 20 °C.',
    form: 'POWDER',
    basisVolumeMl: 1000,
    notes: 'Benzotriazol dodawany jako 5 ml roztworu 1 % (= 0,05 g substancji). Można go pominąć, zwiększając bromek do 1 g/l.',
    packets: [],
    components: [
      { cas: '7757-83-7', quantity: 60 },
      { cas: '123-31-9', quantity: 5 },
      { cas: '497-19-8', quantity: 5 },
      { cas: '92-43-3', quantity: 0.5 },
      { cas: '1303-96-4', quantity: 2.5 },
      { cas: '7758-02-3', quantity: 0.5 },
      { cas: '95-14-7', quantity: 0.05, note: '5 ml roztworu 1 %' },
    ],
    variants: [1000],
    // 1 L koncentratu + 3 L wody ≈ 4000 g roztworu → woda ≈ 4000 g − masa składników
    dilutions: [{ name: 'Roztwór roboczy 1+3', waterMl: 3926 }],
  },
];

export interface SeedProduct {
  sku: string;
  name: string;
  description?: string;
  items: { mixture: string; volumeMl: number; quantity?: number }[];
}

const kit = (sku: string, name: string, volumeMl: number, mixtures: string[]): SeedProduct => ({
  sku,
  name,
  items: mixtures.map((mixture) => ({ mixture, volumeMl })),
});

export const PRODUCTS: SeedProduct[] = [
  kit('ECN2-1L', 'Zestaw ECN-2 — 1 L', 1000, ['ECN2-PREBATH', 'ECN2-DEV', 'ECN2-BLEACH', 'ECN2-FIX']),
  kit('ECN2-05L', 'Zestaw ECN-2 — 0,5 L', 500, ['ECN2-PREBATH', 'ECN2-DEV', 'ECN2-BLEACH', 'ECN2-FIX']),
  kit('D76-1L', 'Wywoływacz D-76 — 1 L', 1000, ['D76']),
  kit('D76-05L', 'Wywoływacz D-76 — 0,5 L', 500, ['D76']),
  kit('C41-1L', 'Zestaw C-41 — 1 L', 1000, ['C41-DEV', 'C41-BLEACH', 'C41-FIX']),
  kit('C41-05L', 'Zestaw C-41 — 0,5 L', 500, ['C41-DEV', 'C41-BLEACH', 'C41-FIX']),
  kit('PYRO510-100', 'Pyro 510 — 100 ml', 100, ['PYRO510']),
];
