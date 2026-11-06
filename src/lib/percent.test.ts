import { describe, it, expect } from 'vitest';
import { parsePercent } from './percent';

describe('parsePercent', () => {
  it('pojedyncza liczba', () => {
    expect(parsePercent('71,4')).toBe(71.4);
  });
  it('kropka i przecinek są równoważne', () => {
    expect(parsePercent('71.4')).toBe(71.4);
  });
  it('zakres → wartość górna (najgorszy przypadek)', () => {
    expect(parsePercent('70-80')).toBe(80);
    expect(parsePercent('1-2,5')).toBe(2.5);
  });
  it('ignoruje znaki nieliczbowe (≥, %, spacje)', () => {
    expect(parsePercent('≥ 8,5 %')).toBe(8.5);
    expect(parsePercent('< 0,1%')).toBe(0.1);
  });
  it('pusty/nullowy wejście → 0', () => {
    expect(parsePercent('')).toBe(0);
    expect(parsePercent(null)).toBe(0);
    expect(parsePercent(undefined)).toBe(0);
  });
  it('tekst bez liczb → 0', () => {
    expect(parsePercent('brak danych')).toBe(0);
  });
  it('bierze maksimum niezależnie od kolejności', () => {
    expect(parsePercent('2,5-1')).toBe(2.5);
  });
});
