/**
 * Odczyt tabeli wpisów zharmonizowanych (zał. VI CLP, tabela 3) w postaci arkusza
 * publikowanego przez ECHA. Czyste funkcje działające na macierzy tekstów komórek.
 *
 * Arkusz ECHA jest nieoficjalny — wiążąca jest tabela 3 zał. VI i kolejne ATP w Dz.U. UE.
 * Rozpoznajemy kolumny po nagłówkach (dwa wiersze nagłówka scalane w jeden opis),
 * więc drobne zmiany układu kolejnych wydań nie psują importu.
 */
import { HAZARD_CLASS_BY_CODE } from '@/data/hazard-classes';
import { isValidCas } from './cas';

export interface AnnexViHazard {
  hazardClass: string;
  statement: string | null;
  sclMin?: number | null;
  sclStatement?: string | null;
  limitOnly?: boolean;
  mFactorAcute?: number | null;
  mFactorChronic?: number | null;
  ateOral?: number | null;
  ateDermal?: number | null;
  ateInhalDust?: number | null;
  ateInhalVapour?: number | null;
  note?: string | null;
}

export interface AnnexViEntry {
  indexNumber: string;
  name: string;
  ecNumbers: string[];
  casNumbers: string[];
  hazards: AnnexViHazard[];
  /** Kody klas z arkusza, których nie ma w słowniku aplikacji */
  unknownClasses: string[];
  notes: string | null;
}

export interface AnnexViParseResult {
  entries: AnnexViEntry[];
  /** Opis rozpoznanych kolumn — do wyświetlenia przy imporcie */
  columns: Record<string, string>;
}

type ColumnKey = 'index' | 'name' | 'ec' | 'cas' | 'classes' | 'statements' | 'limits' | 'notes';

const INDEX_RE = /\b(\d{3}-\d{3}-\d{2}-[\dX])\b/;
const EC_RE = /\b\d{3}-\d{3}-\d\b/g;
const CAS_RE = /\b\d{2,7}-\d{2}-\d\b/g;

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Przypisuje kolumny po treści nagłówka. */
function mapColumns(header: string[]): Partial<Record<ColumnKey, number>> {
  const cols: Partial<Record<ColumnKey, number>> = {};
  header.forEach((h, i) => {
    const t = norm(h);
    if (!t) return;
    if (cols.index === undefined && /index/.test(t)) cols.index = i;
    else if (cols.name === undefined && /(international chemical|chemical name|identification)/.test(t)) cols.name = i;
    else if (cols.ec === undefined && /\bec\b.*no|\bec no|ec number/.test(t)) cols.ec = i;
    else if (cols.cas === undefined && /\bcas\b/.test(t)) cols.cas = i;
    else if (cols.classes === undefined && /hazard class/.test(t)) cols.classes = i;
    else if (cols.classes !== undefined && cols.statements === undefined && /hazard statement/.test(t)) cols.statements = i;
    else if (cols.limits === undefined && /(specific conc|m-factor|\bate\b)/.test(t)) cols.limits = i;
    else if (cols.notes === undefined && /^notes?\b|\bnotes?$/.test(t)) cols.notes = i;
  });
  return cols;
}

/** Normalizuje zapis klasy z arkusza: „Skin Corr.1A *” → „Skin Corr. 1A”. */
export function normalizeClass(raw: string): string {
  return raw
    .replace(/\*+/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/([A-Za-z])\.(?=[0-9A-Za-z])/g, '$1. ')
    .replace(/\s+/g, ' ')
    .replace(/\s+\.$/, '')
    .trim()
    .replace(/^Lact\. ?$/, 'Lact.');
}

const lines = (cell: string) =>
  cell
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

const number = (s: string) => Number(s.replace(/\s+/g, '').replace(',', '.'));

export interface ParsedLimits {
  scl: { hazardClass: string; statement: string | null; min: number }[];
  mAcute: number | null;
  mChronic: number | null;
  ate: { oral?: number; dermal?: number; inhalDust?: number; inhalVapour?: number };
}

/** Kolumna „Specific Conc. Limits, M-factors and ATE”. */
export function parseLimits(cell: string): ParsedLimits {
  const out: ParsedLimits = { scl: [], mAcute: null, mChronic: null, ate: {} };
  for (const line of lines(cell)) {
    // SCL: „Skin Corr. 1B; H314: 2 % ≤ C < 5 %” | „Repr. 1B; H360FD: C ≥ 8,5 %”
    const scl = /^(.+?\d[A-C]?)\s*;\s*((?:EU)?H\d{3}[A-Za-z]{0,3})\s*:\s*(.+)$/.exec(line);
    if (scl) {
      const cond = scl[3];
      const lower = /([\d.,]+)\s*%\s*≤\s*C/.exec(cond) ?? /C\s*(?:≥|>=|>)\s*([\d.,]+)/.exec(cond);
      if (lower) {
        out.scl.push({ hazardClass: normalizeClass(scl[1]), statement: scl[2], min: number(lower[1]) });
        continue;
      }
    }
    // Współczynnik M: „M = 10”, „M=1 000”, „M (acute) = 1”, „M = 10 (chronic)”
    const m = /\bM\s*(?:\((acute|chronic)\))?\s*=\s*([\d\s.,]+?)\s*(?:\((acute|chronic)\))?\s*$/i.exec(line);
    if (m) {
      const kind = (m[1] ?? m[3])?.toLowerCase();
      const v = number(m[2]);
      if (Number.isFinite(v)) {
        if (kind !== 'chronic') out.mAcute = v;
        if (kind !== 'acute') out.mChronic = v;
      }
      continue;
    }
    // ATE: „oral: ATE = 500 mg/kg bw”, „inhalation: ATE = 0,5 mg/L (dusts or mists)”
    const ate = /\b(oral|dermal|inhalation)\b\s*:?\s*ATE\s*=\s*([\d\s.,]+)/i.exec(line);
    if (ate) {
      const v = number(ate[2]);
      if (!Number.isFinite(v)) continue;
      const route = ate[1].toLowerCase();
      if (route === 'oral') out.ate.oral = v;
      else if (route === 'dermal') out.ate.dermal = v;
      else if (/vapou?r/i.test(line)) out.ate.inhalVapour = v;
      else if (/dust|mist/i.test(line)) out.ate.inhalDust = v;
      // gazy (ppmV) — silnik ich nie obsługuje, pomijamy
    }
  }
  return out;
}

const STATEMENT_ROUTE = (h: string | null) =>
  !h ? null : /^H30[0-2]/.test(h) ? 'oral' : /^H31[0-2]/.test(h) ? 'dermal' : /^H33[0-2]/.test(h) ? 'inhal' : null;

/** Buduje wpisy zagrożeń substancji (klasy własne + wpisy „tylko SCL”). */
export function buildHazards(classCell: string, statementCell: string, limitsCell: string) {
  const rawClasses = lines(classCell).map(normalizeClass).filter(Boolean);
  const statements = lines(statementCell)
    .map((s) => /((?:EU)?H\d{3}[A-Za-z]{0,3})/.exec(s)?.[1] ?? null)
    .filter((s): s is string => !!s);
  const limits = parseLimits(limitsCell);
  const unknownClasses: string[] = [];
  const hazards: AnnexViHazard[] = [];

  rawClasses.forEach((cls, i) => {
    const meta = HAZARD_CLASS_BY_CODE.get(cls);
    if (!meta) {
      unknownClasses.push(cls);
      return;
    }
    // Kolumny klas i zwrotów są równoległe; gdy liczby się nie zgadzają — dopasowanie po zwrocie domyślnym.
    const statement =
      statements.length === rawClasses.length
        ? statements[i]
        : (statements.find((h) => meta.defaultStatement && h.startsWith(meta.defaultStatement)) ?? meta.defaultStatement ?? null);
    const scl = limits.scl.find((l) => l.hazardClass === cls);
    const route = STATEMENT_ROUTE(statement);
    hazards.push({
      hazardClass: cls,
      statement,
      ...(scl ? { sclMin: scl.min, sclStatement: scl.statement } : {}),
      ...(cls === 'Aquatic Acute 1' && limits.mAcute != null ? { mFactorAcute: limits.mAcute } : {}),
      ...(cls === 'Aquatic Chronic 1' && limits.mChronic != null ? { mFactorChronic: limits.mChronic } : {}),
      ...(cls.startsWith('Acute Tox.') && route === 'oral' && limits.ate.oral ? { ateOral: limits.ate.oral } : {}),
      ...(cls.startsWith('Acute Tox.') && route === 'dermal' && limits.ate.dermal ? { ateDermal: limits.ate.dermal } : {}),
      ...(cls.startsWith('Acute Tox.') && route === 'inhal' && limits.ate.inhalDust ? { ateInhalDust: limits.ate.inhalDust } : {}),
      ...(cls.startsWith('Acute Tox.') && route === 'inhal' && limits.ate.inhalVapour ? { ateInhalVapour: limits.ate.inhalVapour } : {}),
    });
  });

  // SCL dla klas, których substancja sama nie ma (np. NaOH: Skin Irrit. 2 przy 0,5–2 %).
  for (const l of limits.scl) {
    if (hazards.some((h) => h.hazardClass === l.hazardClass)) continue;
    if (!HAZARD_CLASS_BY_CODE.has(l.hazardClass)) {
      unknownClasses.push(l.hazardClass);
      continue;
    }
    hazards.push({ hazardClass: l.hazardClass, statement: l.statement, sclMin: l.min, sclStatement: l.statement, limitOnly: true });
  }
  return { hazards, unknownClasses };
}

/** Parsuje arkusz (wiersze × komórki jako tekst). */
export function parseAnnexVi(rows: string[][]): AnnexViParseResult {
  const headerAt = rows.slice(0, 40).findIndex((r) => r.some((c) => /index/i.test(c)) && r.some((c) => /\bcas\b/i.test(c)));
  if (headerAt < 0) throw new Error('Nie rozpoznano nagłówka tabeli (brak kolumn „Index No” i „CAS No”).');

  // Nagłówek bywa dwupoziomowy („Classification” nad „Hazard Class…”) — łączymy dwa wiersze.
  const next = rows[headerAt + 1] ?? [];
  const nextIsHeader = !next.some((c) => INDEX_RE.test(c));
  const width = Math.max(rows[headerAt].length, next.length);
  const header = Array.from({ length: width }, (_, i) => `${rows[headerAt][i] ?? ''} ${nextIsHeader ? (next[i] ?? '') : ''}`);
  const cols = mapColumns(header);
  const missing = (['index', 'cas', 'classes', 'statements'] as ColumnKey[]).filter((k) => cols[k] === undefined);
  if (missing.length) throw new Error(`Nie znaleziono kolumn: ${missing.join(', ')}.`);

  const cell = (r: string[], k: ColumnKey) => (cols[k] === undefined ? '' : (r[cols[k]!] ?? '').toString());
  const entries: AnnexViEntry[] = [];
  for (const r of rows.slice(headerAt + (nextIsHeader ? 2 : 1))) {
    const index = INDEX_RE.exec(cell(r, 'index'))?.[1];
    if (!index) continue;
    const casNumbers = [...new Set(cell(r, 'cas').match(CAS_RE) ?? [])].filter(isValidCas);
    const { hazards, unknownClasses } = buildHazards(cell(r, 'classes'), cell(r, 'statements'), cell(r, 'limits'));
    entries.push({
      indexNumber: index,
      name: cell(r, 'name').replace(/\s+/g, ' ').trim(),
      ecNumbers: [...new Set(cell(r, 'ec').match(EC_RE) ?? [])],
      casNumbers,
      hazards,
      unknownClasses,
      notes: cell(r, 'notes').trim() || null,
    });
  }
  const columns = Object.fromEntries(Object.entries(cols).map(([k, i]) => [k, header[i!].replace(/\s+/g, ' ').trim()]));
  return { entries, columns };
}

/** Indeks wpisów po numerze CAS (wpis grupowy może obejmować kilka numerów). */
export function indexByCas(entries: AnnexViEntry[]): Map<string, AnnexViEntry> {
  const map = new Map<string, AnnexViEntry>();
  for (const e of entries) for (const cas of e.casNumbers) if (!map.has(cas)) map.set(cas, e);
  return map;
}

const FIELD_LABELS = [
  ['statement', 'zwrot H', ''],
  ['sclMin', 'SCL', ' %'],
  ['sclStatement', 'zwrot H przy SCL', ''],
  ['mFactorAcute', 'M (ostre)', ''],
  ['mFactorChronic', 'M (przewlekłe)', ''],
  ['ateOral', 'ATE doustnie', ' mg/kg'],
  ['ateDermal', 'ATE skórnie', ' mg/kg'],
  ['ateInhalDust', 'ATE inhalacyjnie (pyły)', ' mg/l'],
  ['ateInhalVapour', 'ATE inhalacyjnie (pary)', ' mg/l'],
] as const;

export interface ExistingHazard extends AnnexViHazard {
  hazardClass: string;
}

/**
 * Scala dane zał. VI z istniejącymi wpisami substancji. Nie usuwa niczego (klasyfikacja
 * zharmonizowana to minimum — dostawca może mieć dodatkowe klasy własne); dla klas
 * występujących w obu źródłach uzupełnia/aktualizuje zwrot, SCL, M i ATE z zał. VI.
 */
export function mergeHazards(existing: ExistingHazard[], annex: AnnexViHazard[]) {
  const result = existing.map((h) => ({ ...h }));
  const changes: string[] = [];
  for (const a of annex) {
    const cur = result.find((h) => h.hazardClass === a.hazardClass);
    if (!cur) {
      result.push({ ...a, note: a.limitOnly ? 'zał. VI CLP — stężenie graniczne' : 'zał. VI CLP' });
      const scl = a.sclMin != null ? ` (SCL ${String(a.sclMin).replace('.', ',')} %)` : '';
      changes.push(`${a.limitOnly ? 'stężenie graniczne' : 'klasa'} ${a.hazardClass}${scl}`);
      continue;
    }
    for (const [f, label, unit] of FIELD_LABELS) {
      const v = a[f];
      if (v === undefined || v === null || cur[f] === v) continue;
      (cur as Record<string, unknown>)[f] = v;
      // zwrot przy SCL równy zwrotowi klasy to szczegół techniczny — nie raportujemy
      if (f === 'sclStatement' && v === (cur.statement ?? a.statement)) continue;
      changes.push(`${a.hazardClass}: ${label} → ${typeof v === 'number' ? String(v).replace('.', ',') : v}${unit}`);
    }
    if (cur.limitOnly && !a.limitOnly) {
      cur.limitOnly = false;
      changes.push(`${a.hazardClass}: klasa własna`);
    }
  }
  return { hazards: result, changes };
}
