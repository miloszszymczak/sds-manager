/**
 * Walidator spójności karty charakterystyki (B3) — „linter".
 *
 * Czyste funkcje sprawdzające zależności między sekcjami. Wejście to lekki,
 * serializowalny model dokumentu (budowany po stronie serwera). Każde uchybienie
 * ma poziom, sekcję i komunikat naprawczy.
 */

import { pictogramsForClasses, statementsForClasses, strongestSignalWord } from '@/data/hazard-classes';
import { HAZARD_STATEMENT_BY_CODE } from '@/data/hazard-statements';

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  severity: Severity;
  section: number;
  message: string;
}

export interface ValidationInput {
  ufi: string | null;
  issueDate: boolean;
  version: string;
  /** dane sekcji 1..16 (obiekty JSON) */
  sections: Record<number, Record<string, unknown>>;
  components: {
    name: string;
    percent: number;
    isSvhc: boolean;
    hazardStatements: string[];
  }[];
}

const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function validateDocument(input: ValidationInput): Issue[] {
  const issues: Issue[] = [];
  const s = input.sections;
  const classes = arr(s[2]?.klasyfikacja);
  const pictos = arr(s[2]?.piktogramy);
  const zwrotyH = arr(s[2]?.zwrotyH);
  const signal = str(s[2]?.hasloOstrzegawcze);

  // 1. Piktogramy 2.2 = wynikające z klas 2.1
  const expectedPictos = pictogramsForClasses(classes);
  for (const p of expectedPictos)
    if (!pictos.includes(p))
      issues.push({ severity: 'error', section: 2, message: `Brak piktogramu ${p} wymaganego przez klasyfikację.` });
  for (const p of pictos)
    if (!expectedPictos.includes(p))
      issues.push({ severity: 'warning', section: 2, message: `Piktogram ${p} nie wynika z żadnej wybranej klasy zagrożenia.` });

  // 2. Hasło ostrzegawcze zgodne z klasami
  const expectedSignal = strongestSignalWord(classes);
  if (expectedSignal && signal !== expectedSignal)
    issues.push({
      severity: 'error',
      section: 2,
      message: `Hasło ostrzegawcze powinno brzmieć „${expectedSignal}" (wynika z klasyfikacji).`,
    });

  // 3. Zwroty H 2.2 pokrywają klasy 2.1 — z uwzględnieniem konwencji CLP:
  //    • forma szczegółowa spełnia ogólną (H360 ⟵ H360FD, H350 ⟵ H350i),
  //    • H410 zastępuje H400 na etykiecie (nie pokazuje się obu).
  const expectedStatements = statementsForClasses(classes);
  for (const h of expectedStatements) {
    const satisfied =
      zwrotyH.includes(h) ||
      zwrotyH.some((z) => z.startsWith(h)) ||
      (h === 'H400' && zwrotyH.some((z) => ['H410', 'H411', 'H412'].includes(z)));
    if (!satisfied)
      issues.push({ severity: 'warning', section: 2, message: `Klasyfikacja sugeruje zwrot ${h}, którego brak w oznakowaniu.` });
  }

  // 4. Sekcja 16 (pełny tekst H) — czy wszystkie użyte kody mają treść w słowniku
  const usedH = new Set<string>([...zwrotyH, ...input.components.flatMap((c) => c.hazardStatements)]);
  for (const h of usedH)
    if (!HAZARD_STATEMENT_BY_CODE.get(h))
      issues.push({ severity: 'warning', section: 16, message: `Zwrot ${h} nie ma treści w słowniku — sprawdź kod.` });

  // 5. SVHC > 0,1 % → wzmianka w 2.3 (art. 33 REACH).
  //    Sprawdzamy WARTOŚĆ pola „svhc" w sekcji 2.3, nie sam klucz.
  const svhc = input.components.filter((c) => c.isSvhc && c.percent > 0.1);
  if (svhc.length > 0) {
    const inne = (s[2]?.inneZagrozenia ?? {}) as Record<string, string>;
    const val = str(inne.svhc).trim().toLowerCase();
    const isNegationOrEmpty = val === '' || /^(brak|nie|---|—|n\/d)/.test(val);
    if (isNegationOrEmpty)
      issues.push({
        severity: 'error',
        section: 2,
        message: `Składnik SVHC (${svhc.map((c) => c.name).join(', ')}) > 0,1 % — wymagana wzmianka w sekcji 2.3 (art. 33 REACH).`,
      });
  }

  // 6. UFI obecny, gdy mieszanina klasyfikowana zdrowotnie/fizycznie
  const healthPhysical = classes.some((c) => !c.startsWith('Aquatic') && !c.startsWith('Ozone'));
  if (healthPhysical && !input.ufi)
    issues.push({
      severity: 'warning',
      section: 1,
      message: 'Mieszanina klasyfikowana zdrowotnie/fizycznie — brak numeru UFI (wymagany przy wprowadzaniu do obrotu).',
    });

  // 7. Transport (14) vs środowisko: Aquatic Acute/Chronic 1 → oczekuj oznaczenia lub adnotacji
  const envDangerous = classes.includes('Aquatic Acute 1') || classes.includes('Aquatic Chronic 1');
  if (envDangerous) {
    const t14 = JSON.stringify(s[14] ?? '').toLowerCase();
    const mentionsEnv =
      t14.includes('3077') ||
      t14.includes('środowisk') ||
      t14.includes('zwolnion') ||
      t14.includes('nie podlega') ||
      t14.includes('nie jest uznan') ||
      t14.includes('lq') ||
      t14.includes('eq');
    if (!mentionsEnv)
      issues.push({
        severity: 'info',
        section: 14,
        message: 'Mieszanina niebezpieczna dla środowiska wodnego — rozważ UN 3077 lub adnotację o zwolnieniu (LQ/EQ) w sekcji 14.',
      });
  }

  // 8. Puste pola obowiązkowe
  const dostawca = (s[1]?.dostawca ?? {}) as Record<string, string>;
  if (!str(dostawca.przedsiebiorstwo))
    issues.push({ severity: 'error', section: 1, message: 'Brak nazwy dostawcy (sekcja 1.3).' });
  const wlas = (s[9]?.wlasciwosci ?? {}) as Record<string, string>;
  if (!str(wlas.stanSkupienia))
    issues.push({ severity: 'warning', section: 9, message: 'Brak stanu skupienia (sekcja 9.1).' });

  // 9. Wersja obecna
  if (!input.version) issues.push({ severity: 'warning', section: 16, message: 'Brak numeru wersji.' });

  // 10. Składniki sekcji 3
  if (input.components.length === 0)
    issues.push({ severity: 'warning', section: 3, message: 'Mieszanina nie ma składników (sekcja 3).' });

  return issues;
}

export function summarize(issues: Issue[]): { errors: number; warnings: number; infos: number } {
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    infos: issues.filter((i) => i.severity === 'info').length,
  };
}
