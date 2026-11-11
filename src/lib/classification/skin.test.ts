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

describe('specyficzne stężenia graniczne dla skóry i oczu (NaOH, zał. VI CLP)', () => {
  // Skin Corr. 1A ≥ 5 %; Skin Corr. 1B 2–5 %; Skin Irrit. 2 i Eye Irrit. 2: 0,5–2 %
  const naoh = [
    { hazardClass: 'Skin Corr. 1A', sclMin: 5 },
    { hazardClass: 'Skin Corr. 1B', sclMin: 2, limitOnly: true },
    { hazardClass: 'Skin Irrit. 2', sclMin: 0.5, limitOnly: true },
    { hazardClass: 'Eye Irrit. 2', sclMin: 0.5, limitOnly: true },
  ];
  const mix = (percent: number) =>
    classifyMixture([
      { name: 'NaOH', percent, hazards: naoh },
      { name: 'siarczan sodu', percent: 100 - percent, hazards: [] },
    ]);

  it('0,83 % (ECN-2 kąpiel wstępna) → Skin Irrit. 2 + Eye Irrit. 2 — bez SCL byłby brak klasyfikacji', () => {
    const r = mix(0.83);
    expect(r.hazardClasses).toEqual(['Skin Irrit. 2', 'Eye Irrit. 2']);
    expect(r.statements).toEqual(['H315', 'H319']);
    expect(r.endpoints.find((e) => e.hazardClass === 'Skin Irrit. 2')!.rule).toContain('z SCL');
  });
  it('2,24 % (utrwalacz szybki) → Skin Corr. 1B, a z niej Eye Dam. 1', () => {
    const r = mix(2.24);
    expect(r.hazardClasses).toEqual(['Skin Corr. 1B', 'Eye Dam. 1']);
  });
  it('6 % → Skin Corr. 1A', () => expect(mix(6).hazardClasses).toContain('Skin Corr. 1A'));
  it('0,3 % → poniżej wszystkich SCL, brak klasyfikacji', () => expect(mix(0.3).hazardClasses).toEqual([]));

  it('addytywność: dwie zasady po 0,3 % (każda poniżej SCL 0,5 %) razem przekraczają próg', () => {
    const r = classifyMixture([
      { name: 'NaOH', percent: 0.3, hazards: naoh },
      { name: 'KOH', percent: 0.3, hazards: naoh },
    ]);
    expect(r.hazardClasses).toContain('Skin Irrit. 2');
  });
  it('wpis „tylko SCL” nie czyni substancji członkiem klasy w sumach ogólnych ani w toksyczności', () => {
    const r = classifyMixture([
      { name: 'x', percent: 50, hazards: [{ hazardClass: 'Acute Tox. 3', limitOnly: true }, { hazardClass: 'Aquatic Acute 1', limitOnly: true }] },
    ]);
    expect(r.hazardClasses).toEqual([]);
  });
});
