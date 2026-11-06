import { describe, it, expect } from 'vitest';
import { validateDocument, summarize, type ValidationInput } from './rules';

/** Kompletna, spójna karta (część A D-76) jako baza pozytywna. */
function goodDoc(): ValidationInput {
  return {
    ufi: 'JXR2-K0MV-900S-YSDM',
    issueDate: true,
    version: '1.0',
    sections: {
      1: { dostawca: { przedsiebiorstwo: 'Miłosz Szymczak' } },
      2: {
        klasyfikacja: ['Acute Tox. 4', 'Eye Dam. 1', 'Skin Sens. 1', 'Muta. 2', 'Carc. 2', 'STOT RE 2', 'Aquatic Acute 1', 'Aquatic Chronic 1'],
        piktogramy: ['GHS05', 'GHS07', 'GHS08', 'GHS09'],
        hasloOstrzegawcze: 'NIEBEZPIECZEŃSTWO',
        zwrotyH: ['H302', 'H318', 'H317', 'H341', 'H351', 'H373', 'H400', 'H410'],
        inneZagrozenia: { svhc: 'brak' },
      },
      9: { wlasciwosci: { stanSkupienia: 'ciało stałe' } },
      14: { wstep: 'UN 3077 materiał zagrażający środowisku' },
    },
    components: [
      { name: 'hydrochinon', percent: 71.4, isSvhc: false, hazardStatements: ['H302', 'H318'] },
      { name: 'metol', percent: 28.6, isSvhc: false, hazardStatements: ['H302', 'H373'] },
    ],
  };
}

describe('walidator — karta kompletna', () => {
  it('część A bez błędów', () => {
    const issues = validateDocument(goodDoc());
    expect(summarize(issues).errors).toBe(0);
  });
});

describe('walidator — reguła piktogramów (2)', () => {
  it('usunięcie wymaganego piktogramu → błąd', () => {
    const d = goodDoc();
    (d.sections[2].piktogramy as string[]) = ['GHS05', 'GHS07', 'GHS09']; // brak GHS08
    const issues = validateDocument(d);
    expect(issues.some((i) => i.section === 2 && i.message.includes('GHS08'))).toBe(true);
  });

  it('nadmiarowy piktogram → ostrzeżenie', () => {
    const d = goodDoc();
    (d.sections[2].piktogramy as string[]).push('GHS02');
    const issues = validateDocument(d);
    expect(issues.some((i) => i.severity === 'warning' && i.message.includes('GHS02'))).toBe(true);
  });
});

describe('walidator — hasło ostrzegawcze', () => {
  it('złe hasło → błąd', () => {
    const d = goodDoc();
    d.sections[2].hasloOstrzegawcze = 'UWAGA';
    expect(validateDocument(d).some((i) => i.message.includes('NIEBEZPIECZEŃSTWO'))).toBe(true);
  });
});

describe('walidator — SVHC art. 33', () => {
  it('składnik SVHC > 0,1 % bez wzmianki w 2.3 → błąd', () => {
    const d = goodDoc();
    d.components[0] = { name: 'boraks', percent: 2, isSvhc: true, hazardStatements: [] };
    d.sections[2].inneZagrozenia = { svhc: '' }; // brak słowa "svhc" w treści
    const issues = validateDocument(d);
    expect(issues.some((i) => i.severity === 'error' && i.message.toLowerCase().includes('svhc'))).toBe(true);
  });

  it('z wzmianką „SVHC" w 2.3 → brak błędu SVHC', () => {
    const d = goodDoc();
    d.components[0] = { name: 'boraks', percent: 2, isSvhc: true, hazardStatements: [] };
    d.sections[2].inneZagrozenia = { svhc: 'Zawiera substancję SVHC (boraks), art. 33 REACH.' };
    expect(validateDocument(d).some((i) => i.message.toLowerCase().includes('art. 33'))).toBe(false);
  });
});

describe('walidator — konwencje zwrotów H (bez fałszywych alarmów)', () => {
  it('H410 na etykiecie spełnia wymóg H400 (nie pokazuje się obu)', () => {
    const d = goodDoc(); // ma H400 i H410
    (d.sections[2].zwrotyH as string[]) = d.sections[2].zwrotyH as string[];
    // usuń H400, zostaw H410
    (d.sections[2].zwrotyH as string[]) = (d.sections[2].zwrotyH as string[]).filter((h) => h !== 'H400');
    const issues = validateDocument(d);
    expect(issues.some((i) => i.message.includes('H400'))).toBe(false);
  });

  it('forma szczegółowa H360FD spełnia ogólną H360', () => {
    const d = goodDoc();
    d.sections[2].klasyfikacja = ['Repr. 1B'];
    d.sections[2].piktogramy = ['GHS08'];
    d.sections[2].hasloOstrzegawcze = 'NIEBEZPIECZEŃSTWO';
    d.sections[2].zwrotyH = ['H360FD'];
    d.components = [{ name: 'boraks', percent: 10, isSvhc: true, hazardStatements: ['H360FD'] }];
    d.sections[2].inneZagrozenia = { svhc: 'Zawiera boraks (SVHC), art. 33 REACH.' };
    const issues = validateDocument(d);
    expect(issues.some((i) => i.message.includes('H360') && i.severity === 'warning')).toBe(false);
  });
});

describe('walidator — pola obowiązkowe', () => {
  it('brak dostawcy → błąd w sekcji 1', () => {
    const d = goodDoc();
    d.sections[1] = {};
    expect(validateDocument(d).some((i) => i.section === 1 && i.severity === 'error')).toBe(true);
  });
});
