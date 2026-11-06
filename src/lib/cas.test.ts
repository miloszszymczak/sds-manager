import { describe, it, expect } from 'vitest';
import { isValidCas, normalizeCas } from './cas';
import { SUBSTANCES, MIXTURES, PRODUCTS } from '../../prisma/data/catalog';

describe('isValidCas', () => {
  it('przyjmuje poprawne numery', () => {
    expect(isValidCas('7732-18-5')).toBe(true); // woda
    expect(isValidCas('123-31-9')).toBe(true);
  });
  it('odrzuca złą cyfrę kontrolną i zły format', () => {
    expect(isValidCas('7732-18-4')).toBe(false);
    expect(isValidCas('123319')).toBe(false);
    expect(isValidCas('1-23-9')).toBe(false);
  });
  it('normalizuje spacje i myślniki typograficzne', () => {
    expect(normalizeCas(' 7732–18–5 ')).toBe('7732-18-5');
  });
});

describe('dane startowe (arkusz „Chemikalia”)', () => {
  it('każdy numer CAS ma poprawną cyfrę kontrolną', () => {
    const bad = SUBSTANCES.filter((s) => !isValidCas(s.cas)).map((s) => `${s.name}: ${s.cas}`);
    expect(bad).toEqual([]);
  });
  it('numery CAS są unikalne', () => {
    const cas = SUBSTANCES.map((s) => s.cas);
    expect(new Set(cas).size).toBe(cas.length);
  });
  it('każdy składnik mieszaniny wskazuje istniejącą substancję i opakowanie', () => {
    const known = new Set(SUBSTANCES.map((s) => s.cas));
    for (const m of MIXTURES) {
      const labels = new Set(m.packets.map((p) => p.label));
      for (const c of m.components) {
        expect(known.has(c.cas), `${m.code}: ${c.cas}`).toBe(true);
        if (labels.size > 0) expect(labels.has(c.packet ?? ''), `${m.code}: ${c.cas} → ${c.packet}`).toBe(true);
      }
    }
  });
  it('każda pozycja produktu wskazuje istniejący wariant mieszaniny', () => {
    const variants = new Set(MIXTURES.flatMap((m) => m.variants.map((v) => `${m.code}@${v}`)));
    for (const p of PRODUCTS) for (const i of p.items) expect(variants.has(`${i.mixture}@${i.volumeMl}`), `${p.sku}`).toBe(true);
  });
});
