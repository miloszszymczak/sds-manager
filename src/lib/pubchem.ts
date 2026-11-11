/**
 * Interpretacja danych PubChem (PUG View, sekcja „GHS Classification”). Czyste funkcje.
 *
 * PubChem agreguje m.in. klasyfikację zharmonizowaną (zał. VI CLP — źródło
 * „Regulation (EC) No 1272/2008”, z numerem indeksowym) oraz zgłoszenia do wykazu
 * C&L ECHA (z odsetkiem zgłaszających). Nie zawiera SCL, współczynników M ani ATE.
 */
import { HAZARD_CLASSES } from '@/data/hazard-classes';

export interface GhsStatement {
  /** Kod zwrotu, np. „H360FD” */
  code: string;
  /** Odsetek zgłoszeń C&L zawierających zwrot (tylko dla źródła ECHA) */
  percent: number | null;
}

export interface GhsSource {
  kind: 'harmonised' | 'notified';
  /** Nazwa wpisu w źródle */
  name: string;
  statements: GhsStatement[];
}

export interface PubchemGhs {
  indexNumber: string | null;
  ecNumber: string | null;
  /** Zał. VI CLP (wiążąca), jeśli substancja ma wpis zharmonizowany */
  harmonised: GhsSource | null;
  /** Zgłoszenia do wykazu C&L ECHA (samoklasyfikacje) */
  notified: GhsSource | null;
}

interface PugView {
  Record?: {
    Section?: PugSection[];
    Reference?: { ReferenceNumber: number; SourceName: string; SourceID?: string; Name?: string }[];
  };
}
interface PugSection {
  TOCHeading: string;
  Section?: PugSection[];
  Information?: { ReferenceNumber: number; Name: string; Value?: { StringWithMarkup?: { String: string }[] } }[];
}

const HARMONISED = 'Regulation (EC) No 1272/2008';
const ECHA = 'European Chemicals Agency';

function findSection(sections: PugSection[] | undefined, heading: string): PugSection | null {
  for (const s of sections ?? []) {
    if (s.TOCHeading === heading) return s;
    const nested = findSection(s.Section, heading);
    if (nested) return nested;
  }
  return null;
}

/**
 * „H302 (99.7%): Harmful…” | „H360FD: May damage…” | „H373 **: …” (gwiazdki = przypisy zał. VI).
 * Zwroty łączone („H302+H312”) pomijamy — ich składowe występują osobno.
 */
export function parseStatement(line: string): GhsStatement | null {
  const m = /^(EUH\d{3}[A-Z]?|H\d{3}[A-Za-z]{0,3})\s*\**\s*(?:\((?:>\s*)?([\d.]+)\s*%\))?\s*:/.exec(line.trim());
  if (!m) return null;
  return { code: m[1], percent: m[2] ? Number(m[2]) : null };
}

export function parsePubchemGhs(json: unknown): PubchemGhs {
  const record = (json as PugView)?.Record;
  const refs = new Map((record?.Reference ?? []).map((r) => [r.ReferenceNumber, r]));
  const section = findSection(record?.Section, 'GHS Classification');
  const out: PubchemGhs = { indexNumber: null, ecNumber: null, harmonised: null, notified: null };

  for (const info of section?.Information ?? []) {
    if (info.Name !== 'GHS Hazard Statements') continue;
    const ref = refs.get(info.ReferenceNumber);
    if (!ref) continue;
    const statements = (info.Value?.StringWithMarkup ?? [])
      .map((s) => parseStatement(s.String))
      .filter((s): s is GhsStatement => s !== null);
    if (ref.SourceName.startsWith(HARMONISED) && !out.harmonised) {
      out.harmonised = { kind: 'harmonised', name: ref.Name ?? '', statements };
      // np. „612-123-00-2[2]” — nawias oznacza pozycję we wpisie grupowym
      const index = /^(\d{3}-\d{3}-\d{2}-[\dX])/.exec(ref.SourceID ?? '');
      if (index) out.indexNumber = index[1];
    } else if (ref.SourceName.startsWith(ECHA) && !out.notified) {
      out.notified = { kind: 'notified', name: ref.Name ?? '', statements };
    }
  }
  for (const ref of refs.values()) {
    const ec = /\(EC:\s*(\d{3}-\d{3}-\d)\)/.exec(ref.Name ?? '');
    if (ec && ref.SourceName.startsWith(ECHA)) {
      out.ecNumber = ec[1];
      break;
    }
  }
  return out;
}

/** „H360FD” → „H360” (kod bazowy do dopasowania klas). */
export const baseStatement = (code: string) => code.replace(/^(H\d{3}).*$/, '$1');

/**
 * Klasy zagrożenia, którym odpowiada zwrot H. Jedna pozycja = dopasowanie jednoznaczne;
 * kilka (np. H314 → Skin Corr. 1/1A/1B/1C) wymaga wyboru kategorii przez chemika.
 */
export function candidateClasses(code: string): string[] {
  const base = baseStatement(code);
  return HAZARD_CLASSES.filter((h) => h.defaultStatement === base).map((h) => h.code);
}
