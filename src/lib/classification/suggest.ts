import { classifyMixture, type ClassificationResult, type EngineComponent, type EngineHazard } from './engine';
import { pictogramsForClasses, statementsForClasses, strongestSignalWord } from '@/data/hazard-classes';

/** Dowolny rekord z danymi strukturalnymi zagrożenia (np. SubstanceHazard z bazy). */
export type HazardRecord = EngineHazard & { [key: string]: unknown };

export const toEngineHazard = (h: HazardRecord): EngineHazard => ({
  hazardClass: h.hazardClass,
  statement: h.statement,
  mFactorAcute: h.mFactorAcute,
  mFactorChronic: h.mFactorChronic,
  ateOral: h.ateOral,
  ateDermal: h.ateDermal,
  ateInhalDust: h.ateInhalDust,
  ateInhalVapour: h.ateInhalVapour,
  sclMin: h.sclMin,
  sclStatement: h.sclStatement,
});

export interface ClassificationSuggestion extends ClassificationResult {
  pictograms: string[];
  signalWord: string | null;
}

export function suggest(input: EngineComponent[]): ClassificationSuggestion {
  const result = classifyMixture(input);
  return {
    ...result,
    pictograms: pictogramsForClasses(result.hazardClasses),
    signalWord: strongestSignalWord(result.hazardClasses),
  };
}

/**
 * Pola sekcji 2 wynikające z klasyfikacji. Zwroty H bierzemy z silnika (uwzględniają
 * SCL, np. H360FD zamiast domyślnego H360); domyślne zwroty klas tylko jako rezerwa.
 */
export function section2FromClasses(classes: string[], statements: string[]) {
  return {
    klasyfikacja: classes,
    piktogramy: pictogramsForClasses(classes),
    zwrotyH: statements.length > 0 ? statements : statementsForClasses(classes),
    hasloOstrzegawcze: strongestSignalWord(classes) ?? '',
  };
}
