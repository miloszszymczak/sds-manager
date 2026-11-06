import { describe, it, expect } from 'vitest';
import { classifyMixture, type EngineComponent } from './engine';

/** Skrót do budowy składnika w testach. */
const c = (name: string, percent: number, hazards: EngineComponent['hazards']): EngineComponent => ({
  name,
  percent,
  hazards,
});

describe('silnik klasyfikacji — CMR z SCL (przypadek boraksu)', () => {
  it('boraks 2 % < SCL 8,5 % → mieszanina NIE dziedziczy Repr. 1B', () => {
    const mix = [
      c('siarczyn sodu', 98, []),
      c('boraks', 2, [{ hazardClass: 'Repr. 1B', sclMin: 8.5, sclStatement: 'H360FD' }]),
    ];
    const r = classifyMixture(mix);
    expect(r.hazardClasses).not.toContain('Repr. 1B');
    expect(r.statements).not.toContain('H360FD');
    // reguła podprogowa jest opisana
    const repr = r.endpoints.find((e) => e.endpoint.includes('rozrodczość'));
    expect(repr?.rule).toContain('< 8,5');
  });

  it('boraks 10 % ≥ SCL 8,5 % → mieszanina dziedziczy Repr. 1B, H360FD', () => {
    const mix = [c('boraks', 10, [{ hazardClass: 'Repr. 1B', sclMin: 8.5, sclStatement: 'H360FD' }])];
    const r = classifyMixture(mix);
    expect(r.hazardClasses).toContain('Repr. 1B');
    expect(r.statements).toContain('H360FD');
  });

  it('próg SCL działa dokładnie na granicy (8,5 %)', () => {
    const r = classifyMixture([c('boraks', 8.5, [{ hazardClass: 'Repr. 1B', sclMin: 8.5, sclStatement: 'H360FD' }])]);
    expect(r.hazardClasses).toContain('Repr. 1B');
  });

  it('bez SCL działa granica ogólna (Repr. 1B ≥ 0,3 %)', () => {
    expect(classifyMixture([c('x', 0.2, [{ hazardClass: 'Repr. 1B' }])]).hazardClasses).not.toContain('Repr. 1B');
    expect(classifyMixture([c('x', 0.5, [{ hazardClass: 'Repr. 1B' }])]).hazardClasses).toContain('Repr. 1B');
  });
});

describe('silnik klasyfikacji — D-76 część A', () => {
  const partA: EngineComponent[] = [
    c('hydrochinon', 71.4, [
      { hazardClass: 'Acute Tox. 4', ateOral: 320 },
      { hazardClass: 'Skin Sens. 1' },
      { hazardClass: 'Eye Dam. 1' },
      { hazardClass: 'Muta. 2' },
      { hazardClass: 'Carc. 2' },
      { hazardClass: 'Aquatic Acute 1', mFactorAcute: 10 },
    ]),
    c('metol', 28.6, [
      { hazardClass: 'Acute Tox. 4', ateOral: 565 },
      { hazardClass: 'Skin Sens. 1' },
      { hazardClass: 'STOT RE 2' },
      { hazardClass: 'Aquatic Acute 1', mFactorAcute: 1 },
      { hazardClass: 'Aquatic Chronic 1', mFactorChronic: 1 },
    ]),
  ];

  it('dziedziczy komplet klas zdrowotnych', () => {
    const r = classifyMixture(partA);
    for (const cls of ['Acute Tox. 4', 'Skin Sens. 1', 'Eye Dam. 1', 'Muta. 2', 'Carc. 2', 'STOT RE 2']) {
      expect(r.hazardClasses).toContain(cls);
    }
  });

  it('Aquatic Acute 1 przez sumowanie z M=10 (Σ ≈ 743 % ≥ 25 %)', () => {
    const r = classifyMixture(partA);
    expect(r.hazardClasses).toContain('Aquatic Acute 1');
    const env = r.endpoints.find((e) => e.endpoint.includes('ostre'));
    expect(env?.rule).toContain('≥ 25');
  });

  it('Aquatic Chronic 1 od metolu (28,6 % ≥ 25 %)', () => {
    expect(classifyMixture(partA).hazardClasses).toContain('Aquatic Chronic 1');
  });

  it('toksyczność ostra przez ATE → kategoria 4 (ATEmix ≈ 365)', () => {
    const r = classifyMixture(partA);
    expect(r.hazardClasses).toContain('Acute Tox. 4');
    const ep = r.endpoints.find((e) => e.hazardClass === 'Acute Tox. 4');
    expect(ep?.rule).toContain('365'); // ATEmix ≈ 365,3
    expect(ep?.rule).toContain('kat. 4');
  });
});

describe('silnik klasyfikacji — środowisko, sumowanie progu 25 %', () => {
  it('składnik Aquatic Acute 1 poniżej 25 % (bez M) nie klasyfikuje', () => {
    const r = classifyMixture([c('x', 10, [{ hazardClass: 'Aquatic Acute 1' }]), c('woda', 90, [])]);
    expect(r.hazardClasses).not.toContain('Aquatic Acute 1');
  });

  it('składnik Aquatic Acute 1 M=10 przy 3 % daje 30 % ≥ 25 %', () => {
    const r = classifyMixture([c('x', 3, [{ hazardClass: 'Aquatic Acute 1', mFactorAcute: 10 }])]);
    expect(r.hazardClasses).toContain('Aquatic Acute 1');
  });
});

describe('silnik klasyfikacji — toksyczność ostra przez wdychanie (właściwa droga ATE)', () => {
  it('ATE dla pyłów klasyfikuje drogę wziewną, nie parową', () => {
    // ATE pyłów 0,4 mg/l przy 100 % → ATEmix = 0,4 → kat. 2 (dust: ≤0,5)
    const r = classifyMixture([c('pył', 100, [{ hazardClass: 'Acute Tox. 2', ateInhalDust: 0.4 }])]);
    const ep = r.endpoints.find((e) => e.endpoint.includes('pyły'));
    expect(ep?.hazardClass).toBe('Acute Tox. 2');
    // brak ATE par → droga parowa nie tworzy punktu końcowego
    expect(r.endpoints.find((e) => e.endpoint.includes('pary'))).toBeUndefined();
  });
});

describe('silnik klasyfikacji — sumowanie działania na skórę i oczy', () => {
  it('Skin Corr. 1 ≥ 5 % → mieszanina żrąca (H314)', () => {
    const r = classifyMixture([c('x', 6, [{ hazardClass: 'Skin Corr. 1' }]), c('woda', 94, [])]);
    expect(r.hazardClasses).toContain('Skin Corr. 1');
    expect(r.statements).toContain('H314');
  });

  it('Skin Corr. 1 poniżej 5 %, ale 10×Σ ≥ 10 % → działa drażniąco na skórę (H315)', () => {
    // 3 % Skin Corr 1: poniżej progu żrącości, ale 10×3 = 30 ≥ 10 → Skin Irrit. 2
    const r = classifyMixture([c('x', 3, [{ hazardClass: 'Skin Corr. 1' }]), c('woda', 97, [])]);
    expect(r.hazardClasses).not.toContain('Skin Corr. 1');
    expect(r.hazardClasses).toContain('Skin Irrit. 2');
    expect(r.statements).toContain('H315');
  });

  it('Skin Corr. 1 wlicza się do sumy Eye Dam. 1 (≥ 3 % → H318)', () => {
    const r = classifyMixture([c('x', 3, [{ hazardClass: 'Skin Corr. 1' }]), c('woda', 97, [])]);
    expect(r.hazardClasses).toContain('Eye Dam. 1');
    expect(r.statements).toContain('H318');
  });

  it('Eye Irrit. 2 przez sumowanie (≥ 10 %) bez Eye Dam.', () => {
    const r = classifyMixture([c('x', 12, [{ hazardClass: 'Eye Irrit. 2' }]), c('woda', 88, [])]);
    expect(r.hazardClasses).toContain('Eye Irrit. 2');
    expect(r.hazardClasses).not.toContain('Eye Dam. 1');
    expect(r.statements).toContain('H319');
  });

  it('poniżej wszystkich progów → brak działania na skórę/oczy', () => {
    const r = classifyMixture([c('x', 2, [{ hazardClass: 'Eye Irrit. 2' }]), c('woda', 98, [])]);
    expect(r.hazardClasses).not.toContain('Eye Irrit. 2');
  });
});

describe('silnik klasyfikacji — mieszanina nieklasyfikowana', () => {
  it('sam siarczyn sodu → brak klas', () => {
    const r = classifyMixture([c('siarczyn sodu', 100, [])]);
    expect(r.hazardClasses).toHaveLength(0);
  });

  it('pusta mieszanina → brak klas, bez wyjątku', () => {
    const r = classifyMixture([]);
    expect(r.hazardClasses).toHaveLength(0);
    expect(r.statements).toHaveLength(0);
  });
});
