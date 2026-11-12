/**
 * Eksport karty charakterystyki do formatu eSDScom XML 5.6 (standard wymiany kart w UE,
 * https://www.esdscom.eu). Czysta funkcja: dane karty → tekst XML zgodny ze schematem
 * vendor/esdscom/SDSComXML.xsd (sprawdzane w testach przez xmllint).
 *
 * Zakres: sekcje 1–3 strukturalnie (identyfikatory, dostawca, klasyfikacja i oznakowanie
 * CLP, skład z klasyfikacją składników), kody odpadów, a tekst pozostałych sekcji jako
 * frazy w odpowiadających im polach. Treść jest w języku polskim (FullText bez PhraseId —
 * eksport nie odwołuje się do katalogu EuPhraC).
 */
import { ESDSCOM_CLASSES, ESDSCOM_EUH_CODES, ESDSCOM_HAZARD_CODES, ESDSCOM_PRECAUTION_CODES } from './esdscom-codes';
import { HAZARD_STATEMENT_BY_CODE } from '@/data/hazard-statements';
import { PRECAUTIONARY_BY_CODE } from '@/data/precautionary-statements';

type Sections = Record<number, Record<string, unknown>>;

export interface EsdscomComponent {
  name: string;
  casNumber: string | null;
  ecNumber: string | null;
  indexNumber: string | null;
  reachNumber: string | null;
  concentration: string | null;
  hazardClasses: string[];
  hazardStatements: string[];
}

export interface EsdscomInput {
  documentId: string;
  productName: string;
  otherNames?: string | null;
  version: string;
  issueDate: Date;
  revisionDate: Date | null;
  ufi: string | null;
  sections: Sections;
  components: EsdscomComponent[];
  wasteCatalog: { code: string; descriptionPl: string; isHazardous: boolean }[];
  legalCatalog: { id: string; title: string; journalRef: string | null }[];
  generatedAt: Date;
  /** Nazwa systemu w nagłówku eksportu */
  system?: string;
}

/* ─────────────── budowanie XML ─────────────── */

type Child = string | null | undefined | false | Child[];

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // znaki sterujące niedozwolone w XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const flat = (children: Child[]): string[] =>
  children.flatMap((c) => (Array.isArray(c) ? flat(c) : c ? [c] : []));

/** Element opcjonalny: pomijany, gdy nie ma treści. */
function el(name: string, ...children: Child[]): string | null {
  const inner = flat(children);
  return inner.length ? `<${name}>${inner.join('')}</${name}>` : null;
}

/** Element wymagany przez schemat: pusty, gdy nie ma treści. */
function req(name: string, ...children: Child[]): string {
  return el(name, ...children) ?? `<${name}/>`;
}

function value(name: string, v: string | number | boolean | null | undefined, max?: number): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return `<${name}>${escape(max ? clip(s, max) : s)}</${name}>`;
}

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1)}…`);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const list = (v: unknown) => (Array.isArray(v) ? (v as unknown[]) : []);
const date = (d: Date) => d.toISOString().slice(0, 10);

/** Fraza z tekstem dowolnym (limit schematu: 1024 znaki na FullText). */
const phrase = (name: string, text: string) => (text ? `<${name}><FullText>${escape(clip(text, 1024))}</FullText></${name}>` : null);

/**
 * Pole wielokrotne: każdy akapit to osobna fraza (zachowuje długie teksty bez obcinania).
 * Puste wartości i placeholdery („—”) pomijamy.
 */
function phrases(name: string, ...texts: unknown[]): string[] {
  return texts
    .flatMap((t) => (Array.isArray(t) ? t : [t]))
    .map(str)
    .filter((t) => t && t !== '—')
    .flatMap((t) => t.split(/\n\s*\n/))
    .map((t) => t.trim())
    .filter(Boolean)
    .flatMap((t) => chunk(t, 1024))
    .map((t) => phrase(name, t)!);
}

function chunk(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const cut = rest.lastIndexOf(' ', max);
    const at = cut > max / 2 ? cut : max;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** „Etykieta: wartość” — dla pól klucz-wartość bez odpowiednika w schemacie. */
const labelled = (label: string, v: unknown) => (str(v) ? `${label}: ${str(v)}` : '');

/* ─────────────── mapowanie kodów CLP ─────────────── */

const ACUTE_ROUTE: Record<string, { route: 'oral' | 'dermal' | 'inhalation'; cats: number[] }> = {
  H300: { route: 'oral', cats: [1, 2] },
  H301: { route: 'oral', cats: [3] },
  H302: { route: 'oral', cats: [4] },
  H310: { route: 'dermal', cats: [1, 2] },
  H311: { route: 'dermal', cats: [3] },
  H312: { route: 'dermal', cats: [4] },
  H330: { route: 'inhalation', cats: [1, 2] },
  H331: { route: 'inhalation', cats: [3] },
  H332: { route: 'inhalation', cats: [4] },
};

/**
 * Klasa i kategoria w notacji eSDScom. Schemat rozróżnia drogę narażenia dla
 * toksyczności ostrej i rodzaj działania dla STOT SE 3 — ustalamy je ze zwrotów H.
 */
export function esdscomClasses(hazardClass: string, statements: string[]): string[] {
  const acute = /^Acute Tox\. ([1-4])$/.exec(hazardClass);
  if (acute) {
    const cat = Number(acute[1]);
    const routes = [
      ...new Set(
        statements
          .map((h) => ACUTE_ROUTE[h.replace(/^(H\d{3}).*/, '$1')])
          .filter((r) => r && r.cats.includes(cat))
          .map((r) => r!.route),
      ),
    ];
    return (routes.length ? routes : ['oral']).map((r) => `Acute Tox. ${cat} (${r})`);
  }
  if (hazardClass === 'STOT SE 3') {
    const resp = statements.includes('H335');
    const narc = statements.includes('H336');
    return [resp && narc ? 'STOT SE 3 (resp., narc.)' : narc ? 'STOT SE 3 (narc.)' : 'STOT SE 3 (resp.)'];
  }
  return ESDSCOM_CLASSES.has(hazardClass) ? [hazardClass] : [];
}

function classificationBlock(classes: string[], statements: string[]): string | null {
  const entries = classes.flatMap((c) =>
    esdscomClasses(c, statements).map((code) =>
      el('Classification', value('HazardClassCategory', code), phrase('HazardClassCategoryPrintable', code)),
    ),
  );
  return el('Classification', el('ClpHazardClassification_2023_707', entries));
}

const hazardCode = (h: string) => h.replace(/^H/, '');

function hazardStatement(code: string): string | null {
  if (!/^H/.test(code) || !ESDSCOM_HAZARD_CODES.has(hazardCode(code))) return null;
  const text = HAZARD_STATEMENT_BY_CODE.get(code)?.textPl;
  return el('HazardStatement', value('PhraseCode', hazardCode(code)), value('FullText', text, 1024));
}

function precautionaryStatement(code: string): string | null {
  const parts = code.split('+').map((p) => p.replace(/^P/, ''));
  if (parts.length > 5 || !parts.every((p) => ESDSCOM_PRECAUTION_CODES.has(p))) return null;
  const text = PRECAUTIONARY_BY_CODE.get(code)?.textPl ?? code;
  return el('PrecautionaryStatement', parts.map((p) => value('PhraseCode', p)), value('FullText', text, 1024));
}

function supplemental(code: string): string | null {
  const m = /^EUH(\d{3})/.exec(code);
  if (!m || !ESDSCOM_EUH_CODES.has(m[1])) return null;
  return el('SupplementalHazardInformation', value('PhraseCode', m[1]), value('FullText', HAZARD_STATEMENT_BY_CODE.get(code)?.textPl, 1024));
}

const SIGNAL: Record<string, string> = { NIEBEZPIECZEŃSTWO: 'DGR', UWAGA: 'WNG' };

/* ─────────────── stężenie ─────────────── */

/** „71,4” → równe; „70-80” → zakres; „< 0,1” / „≤ 5” → górna granica; „≥ 10” → dolna. */
export function concentrationRange(raw: string | null): string {
  const s = (raw ?? '').replace(/,/g, '.').replace(/%/g, '').trim();
  const num = (x: string) => Number(x).toString();
  let m: RegExpExecArray | null;
  if ((m = /^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/.exec(s))) {
    return `<UpperValueSymbol>le</UpperValueSymbol><UpperValue>${num(m[2])}</UpperValue><LowerValueSymbol>ge</LowerValueSymbol><LowerValue>${num(m[1])}</LowerValue><Unit>%</Unit>`;
  }
  if ((m = /^(<|≤|<=)\s*(\d+(?:\.\d+)?)$/.exec(s))) {
    return `<UpperValueSymbol>${m[1] === '<' ? 'lt' : 'le'}</UpperValueSymbol><UpperValue>${num(m[2])}</UpperValue><Unit>%</Unit>`;
  }
  if ((m = /^(>|≥|>=)\s*(\d+(?:\.\d+)?)$/.exec(s))) {
    return `<LowerValueSymbol>${m[1] === '>' ? 'gt' : 'ge'}</LowerValueSymbol><LowerValue>${num(m[2])}</LowerValue><Unit>%</Unit>`;
  }
  if ((m = /^(\d+(?:\.\d+)?)$/.exec(s))) return `<ExactValueSymbol>eq</ExactValueSymbol><ExactValue>${num(m[1])}</ExactValue><Unit>%</Unit>`;
  return `<ExactValueSymbol>ca</ExactValueSymbol><ExactValue>0</ExactValue><Unit>%</Unit>`;
}

const CAS_RE = /^\d{2,7}-\d{2}-\d$/;
const EC_RE = /^\d{3}-\d{3}-\d$/;
const INDEX_RE = /^\d{3}-\d{3}-\d{2}-\d$/;
const REACH_RE = /^01-\d{10}-\d{2}(-\d{4})?$/;
const ok = (re: RegExp, v: string | null | undefined) => (v && re.test(v.trim()) ? v.trim() : null);

function substanceIdentity(c: EsdscomComponent): string {
  return req(
    'Substance',
    value('GenericName', c.name, 1024),
    value('CasNo', ok(CAS_RE, c.casNumber)),
    el('RegionEU', value('IndexNo', ok(INDEX_RE, c.indexNumber)), value('EcNo', ok(EC_RE, c.ecNumber)), value('ReachRegNo', ok(REACH_RE, c.reachNumber))),
  );
}

/* ─────────────── sekcje ─────────────── */

function section1(i: EsdscomInput): string {
  const s = i.sections[1] ?? {};
  const id = obj(s.identyfikator);
  const sup = obj(s.dostawca);
  const phones = list(s.telefonyAlarmowe).map(obj).filter((p) => str(p.numer));
  const ufi = str(id.ufi) || i.ufi || '';
  return req(
    'IdentificationSubstPrep',
    req(
      'TradeProductIdentity',
      value('ProductNoUser', i.documentId, 128),
      el(
        'ProductIdentifiers',
        value('TradeName', str(id.nazwaProduktu) || i.productName, 1024),
        str(id.inneNazwy) && value('TradeName', id.inneNazwy as string, 1024),
        el('RegionEU', /^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/.test(ufi) ? value('Ufi', ufi) : null),
      ),
      phrase('ProductDefinition', str(id.postacHandlowa)),
    ),
    phrases('Use', s.zastosowaniaZidentyfikowane),
    phrases('UseAdvisedAgainst', s.zastosowaniaOdradzane),
    el(
      'RegionEU',
      value('SdsName', `Karta charakterystyki — ${i.productName}`, 512),
      value('VersionNo', i.version, 10),
      value('IssueDate', date(i.issueDate)),
      i.revisionDate && value('RevisionDate', date(i.revisionDate)),
      req(
        'SupplierInformation',
        value('Country', 'PL'),
        value('Name', str(sup.przedsiebiorstwo) || '—', 256),
        req('Address', value('VisitingAddressLine1', str(sup.adres), 256)),
        value('Phone', str(sup.telefon) || '—', 256),
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(sup.email)) && value('Email', str(sup.email)),
        str(sup.www) && value('CompanyUrl', /^https?:\/\//.test(str(sup.www)) ? str(sup.www) : `https://${str(sup.www)}`),
      ),
      phones.map((p) =>
        el('EmergencyPhone', value('No', str(p.numer), 256), phrase('EmergencyPhoneDescription', [str(p.nazwa), str(p.uwagi)].filter(Boolean).join(' — '))),
      ),
    ),
  );
}

function section2(i: EsdscomInput): string {
  const s = i.sections[2] ?? {};
  const classes = list(s.klasyfikacja).map(String);
  const statements = list(s.zwrotyH).map(String);
  const pictograms = list(s.piktogramy).map(String).filter((p) => /^GHS0[1-9]$/.test(p)).slice(0, 6);
  const signal = SIGNAL[str(s.hasloOstrzegawcze)];
  const other = obj(s.inneZagrozenia);
  return req(
    'HazardIdentification',
    el(
      'RegionEU',
      classificationBlock(classes, statements),
      phrases('ClassificationAdditionalInformation', s.uzasadnienie),
      el(
        'HazardLabelling',
        el(
          'ClpHazardLabelling_2023_707',
          pictograms.map((p) => value('HazardPictogram', p)),
          signal && el('SignalWord', value('PhraseCode', signal), value('FullText', str(s.hasloOstrzegawcze))),
          statements.map(hazardStatement),
          list(s.zwrotyP).map(String).map(precautionaryStatement),
          statements.map(supplemental),
          phrases('AdditionalLabellingInfo', s.informacjeDodatkowe),
        ),
      ),
      el(
        'OtherHazardsInfo',
        phrases('OtherHazards', labelled('PBT/vPvB', other.pbt), labelled('SVHC', other.svhc), labelled('Właściwości zaburzające funkcjonowanie układu hormonalnego', other.endokrynne), other.pozostale),
      ),
    ),
  );
}

function section3(i: EsdscomInput): string {
  const s = i.sections[3] ?? {};
  const components = i.components.map((c) =>
    el(
      'Component',
      substanceIdentity(c),
      el('Concentration', concentrationRange(c.concentration)),
      el(
        'Classification',
        el(
          'ClpHazardClassification_2023_707',
          c.hazardClasses.flatMap((cls) =>
            esdscomClasses(cls, c.hazardStatements).map((code) =>
              el('Classification', value('HazardClassCategory', code), phrase('HazardClassCategoryPrintable', code)),
            ),
          ),
        ),
      ),
    ),
  );
  return req(
    'Composition',
    phrases('ChemicalCharacterization', s.opis, s.uwagi),
    // Mieszanina bez składników nie spełnia schematu (Component 1..n) — wtedy tylko opis.
    components.length > 0 && el('RegionEU', value('CompositionType', 'Mixture'), components),
  );
}

function section4(i: EsdscomInput): string {
  const s = i.sections[4] ?? {};
  const d = obj(s.drogi);
  return req(
    'FirstAidMeasures',
    el(
      'DescriptionOfFirstAidMeasures',
      phrases('GeneralInformation', s.uwagiOgolne),
      phrases('FirstAidInhalation', d.wdychanie),
      phrases('FirstAidSkin', d.skora),
      phrases('FirstAidEye', d.oczy),
      phrases('FirstAidIngestion', d.polkniecie),
      phrases('PersonalProtectionFirstAider', d.ochronaRatownika),
    ),
    el('InformationToHealthProfessionals', phrases('SymptomsAndEffectsGeneral', list(s.objawy))),
    el('MedicalAttentionAndSpecialTreatmentNeeded', phrases('MedicalTreatment', s.pomocLekarska)),
  );
}

function section5(i: EsdscomInput): string {
  const s = i.sections[5] ?? {};
  return req(
    'FireFightingMeasures',
    el('ExtinguishingMedia', phrases('MediaToBeUsed', s.odpowiednie), phrases('MediaNotBeUsed', s.niewlasciwe)),
    phrases('FireAndExplosionHazards', s.zagrozenia),
    phrases('FireFightingPrecautions', s.informacje),
  );
}

function section6(i: EsdscomInput): string {
  const s = i.sections[6] ?? {};
  return req(
    'AccidentalReleaseMeasures',
    el('ForNonEmergencyPersonnel', phrases('PersonalPrecautions', s.srodkiOstroznosci)),
    phrases('EnvironmentalPrecautions', s.ochronaSrodowiska),
    el('ContainmentAndCleaningUp', phrases('CleaningUp', s.metodyUsuwania)),
    phrases('ReferenceToOtherSections', s.odniesienia),
  );
}

function section7(i: EsdscomInput): string {
  const s = i.sections[7] ?? {};
  return req(
    'HandlingAndStorage',
    el('SafeHandling', phrases('HandlingPrecautions', list(s.postepowanie))),
    el('ConditionsForSafeStorage', phrases('TechnicalMeasuresAndStorageConditions', s.magazynowanie)),
    el('SpecificEndUses', phrases('Recommendations', s.zastosowaniaKoncowe)),
  );
}

function section8(i: EsdscomInput): string {
  const s = i.sections[8] ?? {};
  const ppe = obj(s.ochronaIndywidualna);
  const nds = list(s.nds)
    .map(obj)
    .map((r) => [str(r.skladnik), r.nds && `NDS ${str(r.nds)}`, r.ndsch && `NDSCh ${str(r.ndsch)}`, r.ndsp && `NDSP ${str(r.ndsp)}`, str(r.uwagi)].filter(Boolean).join('; '));
  const dnel = list(s.dnel).map(obj).map((r) => `DNEL — ${[r.substancja, r.droga, r.pracownik && `pracownicy: ${str(r.pracownik)}`, r.populacja && `populacja: ${str(r.populacja)}`].filter(Boolean).join('; ')}`);
  const pnec = list(s.pnec).map(obj).map((r) => `PNEC — ${[r.substancja, r.przedzial, r.wartosc].filter(Boolean).join('; ')}`);
  return req(
    'ExposureControlPersonalProtection',
    el('ControlParameters', phrases('AdditionalInfo', s.podstawaPrawna, nds, dnel, pnec, s.monitoring)),
    el('ExposureControlAppropriateMeasures', phrases('AppropriateEngineeringControls', s.srodkiTechniczne)),
    el(
      'PersonalProtectionEquipment',
      phrases('AdditionalInfo', labelled('Ochrona oczu lub twarzy', ppe.oczy), labelled('Ochrona rąk', ppe.rece), labelled('Ochrona dróg oddechowych', ppe.drogiOddechowe), labelled('Ochrona ciała', ppe.cialo), ppe.inne),
    ),
    el('EnvironmentalExposureControls', phrases('EnvironmentalExposureControls', s.kontrolaSrodowiska)),
  );
}

const PROPERTY_LABEL: Record<string, string> = {
  progZapachu: 'Próg zapachu',
  temperaturaTopnienia: 'Temperatura topnienia/krzepnięcia',
  temperaturaWrzenia: 'Temperatura wrzenia',
  palnosc: 'Palność',
  graniceWybuchowosci: 'Granice wybuchowości',
  temperaturaZaplonu: 'Temperatura zapłonu',
  temperaturaSamozaplonu: 'Temperatura samozapłonu',
  temperaturaRozkladu: 'Temperatura rozkładu',
  pH: 'pH',
  lepkosc: 'Lepkość kinematyczna',
  rozpuszczalnosc: 'Rozpuszczalność',
  wspolczynnikPodzialu: 'Współczynnik podziału n-oktanol/woda',
  preznoscPary: 'Prężność pary',
  gestosc: 'Gęstość',
  gestoscPary: 'Względna gęstość pary',
  charakterystykaCzasteczek: 'Charakterystyka cząsteczek',
  wlasciwosciWybuchowe: 'Właściwości wybuchowe',
  wlasciwosciUtleniajace: 'Właściwości utleniające',
};

function section9(i: EsdscomInput): string {
  const s = i.sections[9] ?? {};
  const w = obj(s.wlasciwosci);
  const other = { ...w, ...obj(s.inne) };
  return req(
    'PhysicalChemicalProperties',
    el('Appearance', phrases('FormDescription', w.stanSkupienia), phrases('ColourDescription', w.kolor), phrase('Odour', str(w.zapach))),
    phrases('OtherPhysicalChemicalProperty', Object.entries(PROPERTY_LABEL).map(([k, label]) => labelled(label, other[k]))),
  );
}

function section10(i: EsdscomInput): string {
  const s = i.sections[10] ?? {};
  return req(
    'StabilityReactivity',
    phrases('ReactivityDescription', s.reaktywnosc),
    phrases('StabilityDescription', s.stabilnosc),
    phrases('HazardousReactions', s.niebezpieczneReakcje),
    phrases('ConditionsToAvoid', s.warunkiDoUnikania),
    phrases('MaterialsToAvoid', s.materialyNiezgodne),
    phrases('HazardousDecompositionProducts', s.produktyRozkladu),
  );
}

const TOX_LABEL: Record<string, string> = {
  toksycznoscOstra: 'Toksyczność ostra',
  dzialanieZrace: 'Działanie żrące/drażniące na skórę',
  uszkodzenieOczu: 'Poważne uszkodzenie oczu/działanie drażniące na oczy',
  dzialanieUczulajace: 'Działanie uczulające na drogi oddechowe lub skórę',
  dzialanieMutagenne: 'Działanie mutagenne na komórki rozrodcze',
  dzialanieRakotworcze: 'Rakotwórczość',
  szkodliweRozrodczosc: 'Szkodliwe działanie na rozrodczość',
  stotSe: 'STOT — narażenie jednorazowe',
  stotRe: 'STOT — narażenie powtarzane',
  zagrozenieAspiracja: 'Zagrożenie spowodowane aspiracją',
};

function section11(i: EsdscomInput): string {
  const s = i.sections[11] ?? {};
  const k = obj(s.klasy);
  const routes = obj(s.drogiNarazenia);
  const data = list(s.daneToksykologiczne)
    .map(obj)
    .map((r) => [r.skladnik, r.parametr, r.droga, r.gatunek, r.wartosc, r.metoda].map(str).filter(Boolean).join('; '));
  return req(
    'ToxicologicalInformation',
    phrases(
      'AdditionalInfo',
      Object.entries(TOX_LABEL).map(([key, label]) => labelled(label, k[key])),
      data,
      labelled('Drogi narażenia — oczy', routes.oczy),
      labelled('Drogi narażenia — skóra', routes.skora),
      labelled('Drogi narażenia — wdychanie', routes.wdychanie),
      labelled('Drogi narażenia — połknięcie', routes.polkniecie),
      s.dzialanieChroniczne,
      s.inneZagrozenia,
    ),
  );
}

function section12(i: EsdscomInput): string {
  const s = i.sections[12] ?? {};
  const data = list(s.daneEkotoksykologiczne)
    .map(obj)
    .map((r) => [r.skladnik, r.parametr, r.gatunek, r.czas, r.wartosc, r.metoda].map(str).filter(Boolean).join('; '));
  return req(
    'EcologicalInformation',
    el('EcotoxicologicalInformation', phrases('EcotoxicologyOverallEvaluation', s.podsumowanie, data)),
    el('PersistenceDegradability', phrases('PersistenceDegradabilityEvaluation', s.trwalosc)),
    el('Bioaccumulation', phrases('BioaccumulationEvaluation', s.bioakumulacja)),
    el('Mobility', phrases('MobilityEvaluation', s.mobilnosc)),
    el(
      'AdditionalEcotoxInformation',
      phrases('AdditionalInformation', labelled('Właściwości zaburzające funkcjonowanie układu hormonalnego', s.endokrynne), s.inneSkutki),
    ),
    el('RegionEU', phrase('ResultsOfPbtAndVpvbAssessment', str(s.pbtVpvb))),
  );
}

function section13(i: EsdscomInput): string {
  const s = i.sections[13] ?? {};
  const catalog = new Map(i.wasteCatalog.map((w) => [w.code, w]));
  const entries = list(s.kodyOdpadow)
    .map(String)
    .map((raw) => {
      const code = raw.replace(/\*/g, '').trim();
      if (!/^\d{2} \d{2} \d{2}$/.test(code)) return null;
      const w = catalog.get(raw) ?? catalog.get(code);
      return el(
        'EWLProduct',
        value('WasteCode', code),
        w && phrase('WasteDescription', w.descriptionPl),
        value('HazardousWaste', raw.includes('*') || w?.isHazardous ? 'true' : 'false'),
      );
    });
  return req(
    'DisposalConsiderations',
    el('WasteTreatment', phrases('ProductWaste', s.metody), phrases('PackagingWaste', s.opakowania)),
    el('RegionEU', el('EuropeanWasteList', entries)),
  );
}

function section14(i: EsdscomInput): string {
  const s = i.sections[14] ?? {};
  const t = obj(s.transport);
  const modes = Object.entries(obj(t.mody)).map(([mode, v]) =>
    labelled(mode.toUpperCase(), Object.entries(obj(v)).map(([k, x]) => labelled(k, x)).filter(Boolean).join(', ')),
  );
  return req(
    'TransportInformation',
    phrases('AdditionalInfo', s.wstep, t.niePodlega === true ? 'Produkt nie podlega przepisom dotyczącym transportu towarów niebezpiecznych.' : modes, s.informacjeDodatkowe),
  );
}

function section15(i: EsdscomInput): string {
  const s = i.sections[15] ?? {};
  const refs = new Map(i.legalCatalog.map((l) => [l.id, l]));
  const legal = list(s.przepisy)
    .map(String)
    .map((id) => refs.get(id))
    .filter((l): l is NonNullable<typeof l> => !!l)
    .map((l) => [l.title, l.journalRef].filter(Boolean).join(' — '));
  return req(
    'RegulatoryInformation',
    phrases('AdditionalInfo', s.ocenaBezpieczenstwa),
    el('RegionEU', el('EuLegislation', phrases('OtherEuLegislation', legal))),
  );
}

function section16(i: EsdscomInput): string {
  const s = i.sections[16] ?? {};
  return req(
    'OtherInformation',
    phrases('EducationalRecommendations', s.szkolenia),
    phrases('FurtherInformation', s.zastrzezenie),
    phrases('MainInformationSource', list(s.zrodla)),
    el(
      'RevisionInformation',
      value('RevisionNo', i.version, 16),
      i.revisionDate && value('LastUpdateDate', date(i.revisionDate)),
    ),
    phrases('SdsStatus', s.zmiany),
  );
}

/** Dokument eSDScom XML z jedną lub kilkoma kartami (np. wszystkie opakowania zestawu). */
export function buildEsdscom(inputs: EsdscomInput | EsdscomInput[]): string {
  const all = Array.isArray(inputs) ? inputs : [inputs];
  if (all.length === 0) throw new Error('Brak kart do eksportu');
  const input = all[0];
  const header = el(
    'InformationFromExportingSystem',
    value('SdscomVersionNo', '5.6'),
    el('Language', value('FreetextLanguageCode', 'pl')),
    el('RegulationsRelatedToCountryOrRegion', value('RegulationsRelatedToCountryOrRegionCode', 'PL')),
    value('SystemUsedInPreparation', input.system ?? 'sds-manager', 64),
    value('DateGeneratedExport', date(input.generatedAt)),
  );
  const datasheet = all
    .map((i) =>
      el(
        'Datasheet',
        [section1, section2, section3, section4, section5, section6, section7, section8].map((f) => f(i)),
        [section9, section10, section11, section12, section13, section14, section15, section16].map((f) => f(i)),
      ),
    )
    .join('');
  // Schemat ma elementFormDefault="unqualified": w przestrzeni nazw jest tylko element główny.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<eSDScom:DatasheetFeed xmlns:eSDScom="http://www.esdscom.eu/eSDScom">${header}${datasheet}</eSDScom:DatasheetFeed>\n`;
}
