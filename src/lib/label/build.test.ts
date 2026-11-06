import { describe, it, expect } from 'vitest';
import { buildLabel, selectPrecautionary, MAX_PRECAUTIONARY } from './build';

describe('etykieta — dobór zwrotów P', () => {
  it('nie skraca, gdy zwrotów jest ≤ maksimum', () => {
    const codes = ['P201', 'P280', 'P305+P351+P338'];
    expect(selectPrecautionary(codes)).toEqual(codes);
  });

  it('ogranicza do maksimum i bierze z różnych grup', () => {
    const codes = ['P201', 'P202', 'P260', 'P273', 'P280', 'P302+P352', 'P305+P351+P338', 'P391', 'P501'];
    const picked = selectPrecautionary(codes);
    expect(picked.length).toBe(MAX_PRECAUTIONARY);
    expect(picked).toContain('P501'); // grupa USUWANIE reprezentowana
  });
});

describe('etykieta — model', () => {
  it('składa piktogramy, zwroty i „Zawiera"', () => {
    const label = buildLabel({
      productName: 'D-76 część A',
      ufi: 'JXR2-K0MV-900S-YSDM',
      supplier: { name: 'X', address: 'ul. Y', phone: '+48' },
      pictograms: ['GHS05', 'GHS07', 'GHS08', 'GHS09'],
      signalWord: 'NIEBEZPIECZEŃSTWO',
      hazardStatements: ['H302', 'H318'],
      precautionaryStatements: ['P280', 'P305+P351+P338'],
      supplementalText: 'Zawiera: hydrochinon, siarczan metolu. EUH208',
      namedComponents: [],
    });
    expect(label.pictograms).toHaveLength(4);
    expect(label.pictograms[0].svg).toContain('<svg');
    expect(label.hazardStatements[0]).toEqual({ code: 'H302', text: 'Działa szkodliwie po połknięciu.' });
    expect(label.contains).toEqual(['hydrochinon', 'siarczan metolu']);
    expect(label.supplemental).toContain('EUH208');
  });

  it('preferuje jawnie nazwane składniki nad parsowaniem tekstu', () => {
    const label = buildLabel({
      productName: 'x', ufi: null, supplier: { name: '', address: '', phone: '' },
      pictograms: [], signalWord: null, hazardStatements: [], precautionaryStatements: [],
      supplementalText: 'Zawiera: coś innego', namedComponents: ['boraks'],
    });
    expect(label.contains).toEqual(['boraks']);
  });
});
