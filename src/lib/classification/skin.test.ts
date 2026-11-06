import { describe, it, expect } from 'vitest';
import { classifyMixture } from './engine';
import { pictogramsForClasses, strongestSignalWord } from '@/data/hazard-classes';

describe('podkategoria działania żrącego (CLP 3.2.3.3.4)', () => {
  it('Σ Skin Corr. 1A ≥ 5 % → mieszanina Skin Corr. 1A z piktogramem GHS05', () => {
    const r = classifyMixture([
      { name: 'NaOH', percent: 6, hazards: [{ hazardClass: 'Skin Corr. 1A' }] },
      { name: 'woda', percent: 94, hazards: [] },
    ]);
    expect(r.hazardClasses).toContain('Skin Corr. 1A');
    expect(pictogramsForClasses(r.hazardClasses)).toContain('GHS05');
    expect(strongestSignalWord(r.hazardClasses)).toBe('NIEBEZPIECZEŃSTWO');
  });
  it('1A poniżej progu, ale 1A + 1B ≥ 5 % → Skin Corr. 1B', () => {
    const r = classifyMixture([
      { name: 'x', percent: 3, hazards: [{ hazardClass: 'Skin Corr. 1A' }] },
      { name: 'y', percent: 3, hazards: [{ hazardClass: 'Skin Corr. 1B' }] },
    ]);
    expect(r.hazardClasses).toContain('Skin Corr. 1B');
  });
  it('składnik bez podkategorii → Skin Corr. 1 (klasa istnieje w słowniku)', () => {
    const r = classifyMixture([{ name: 'x', percent: 10, hazards: [{ hazardClass: 'Skin Corr. 1' }] }]);
    expect(r.hazardClasses).toContain('Skin Corr. 1');
    expect(pictogramsForClasses(r.hazardClasses)).toContain('GHS05');
  });
});
