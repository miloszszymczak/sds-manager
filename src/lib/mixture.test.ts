import { describe, it, expect } from 'vitest';
import {
  massOf,
  packetComposition,
  packetMass,
  variantFactor,
  workingSolution,
  formatPercent,
  formatConcentration,
  formatVolume,
  formatMass,
  type CompositionInput,
} from './mixture';

const d76: CompositionInput[] = [
  { key: 'metol', packetId: 'A', quantity: 2, unit: 'g' },
  { key: 'hq', packetId: 'A', quantity: 5, unit: 'g' },
  { key: 'sulfite', packetId: 'B', quantity: 100, unit: 'g' },
  { key: 'borax', packetId: 'B', quantity: 2, unit: 'g' },
];

describe('massOf', () => {
  it('gramy bez zmian, ujemne → 0', () => {
    expect(massOf({ quantity: 5, unit: 'g' }).grams).toBe(5);
    expect(massOf({ quantity: -3, unit: 'g' }).grams).toBe(0);
  });
  it('ml przeliczane przez gęstość', () => {
    expect(massOf({ quantity: 100, unit: 'ml', density: 0.726 }).grams).toBeCloseTo(72.6);
  });
  it('ml bez gęstości → 1 g/ml i flaga', () => {
    expect(massOf({ quantity: 10, unit: 'ml' })).toEqual({ grams: 10, assumedDensity: true });
  });
});

describe('packetComposition', () => {
  it('D-76 część A: metol 28,57 %, hydrochinon 71,43 %', () => {
    const a = packetComposition(d76, 'A');
    expect(a.map((r) => r.percent)).toEqual([28.57, 71.43]);
  });
  it('liczy tylko składniki danego opakowania', () => {
    const b = packetComposition(d76, 'B');
    expect(b.map((r) => r.key)).toEqual(['sulfite', 'borax']);
    expect(b[1].percent).toBe(1.96); // 2/102
  });
  it('składnik w ml wchodzi masą', () => {
    const pyro: CompositionInput[] = [
      { key: 'tea', packetId: 'P', quantity: 100, unit: 'ml', density: 0.726 },
      { key: 'pyro', packetId: 'P', quantity: 10, unit: 'g' },
    ];
    expect(packetComposition(pyro, 'P')[0].percent).toBeCloseTo((72.6 / 82.6) * 100, 1);
  });
  it('puste opakowanie → 0 bez dzielenia przez zero', () => {
    expect(packetComposition([{ key: 'x', packetId: 'A', quantity: 0, unit: 'g' }], 'A')[0].percent).toBe(0);
  });
});

describe('warianty objętościowe', () => {
  it('współczynnik skali 0,5 L względem 1 L', () => {
    expect(variantFactor(500, 1000)).toBe(0.5);
    expect(variantFactor(500, 0)).toBe(0);
  });
  it('masa netto opakowania skaluje się z wariantem', () => {
    expect(packetMass(d76, 'B')).toBe(102);
    expect(packetMass(d76, 'B', 0.5)).toBe(51);
  });
  it('skład %m/m nie zależy od wariantu', () => {
    const half = d76.map((c) => ({ ...c, quantity: c.quantity / 2 }));
    const pct = (rows: { percent: number }[]) => rows.map((r) => r.percent);
    expect(pct(packetComposition(half, 'A'))).toEqual(pct(packetComposition(d76, 'A')));
  });
});

describe('workingSolution', () => {
  it('woda wchodzi do mianownika', () => {
    const r = workingSolution([{ key: 'a', packetId: 'A', quantity: 20, unit: 'g' }], 980);
    expect(r[0].percent).toBe(2);
  });
  it('ujemna woda → 0', () => {
    expect(workingSolution([{ key: 'a', packetId: 'A', quantity: 10, unit: 'g' }], -5)[0].percent).toBe(100);
  });
});

describe('formatowanie', () => {
  it('procent z przecinkiem', () => expect(formatPercent(71.43)).toBe('71,4'));
  it('śladowe stężenie nie wygląda jak zero', () => {
    expect(formatConcentration(0.017)).toBe('< 0,1');
    expect(formatConcentration(0)).toBe('0');
    expect(formatConcentration(5.43)).toBe('5,4');
    expect(formatConcentration(0.004, 2)).toBe('< 0,01');
  });
  it('objętość', () => {
    expect(formatVolume(1000)).toBe('1 L');
    expect(formatVolume(500)).toBe('0,5 L');
    expect(formatVolume(100)).toBe('100 ml');
    expect(formatVolume(1500)).toBe('1,5 L');
  });
  it('masa', () => {
    expect(formatMass(107)).toBe('107 g');
    expect(formatMass(2.5)).toBe('2,5 g');
    expect(formatMass(0.0012)).toBe('1,2 mg');
  });
});
