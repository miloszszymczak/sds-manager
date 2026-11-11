import { describe, it, expect } from 'vitest';
import fixture from './__fixtures__/pubchem-ghs-hydroquinone.json';
import { candidateClasses, parsePubchemGhs, parseStatement } from './pubchem';

describe('parseStatement', () => {
  it('zwrot bez odsetka (wpis zharmonizowany)', () =>
    expect(parseStatement('H360FD: May damage fertility [Danger Reproductive toxicity]')).toEqual({ code: 'H360FD', percent: null }));
  it('zwrot z odsetkiem zgłoszeń, także „> 99.9%”', () => {
    expect(parseStatement('H302 (99.7%): Harmful if swallowed')).toEqual({ code: 'H302', percent: 99.7 });
    expect(parseStatement('H317 (> 99.9%): May cause an allergic skin reaction')).toEqual({ code: 'H317', percent: 99.9 });
  });
  it('gwiazdki przypisów zał. VI nie przeszkadzają', () =>
    expect(parseStatement('H373 **: May causes damage to organs')).toEqual({ code: 'H373', percent: null }));
  it('pomija zwroty łączone i tekst bez kodu', () => {
    expect(parseStatement('H302+H312 (17.7%): Harmful if swallowed or in contact with skin')).toBeNull();
    expect(parseStatement('Not classified')).toBeNull();
  });
});

describe('parsePubchemGhs (rzeczywista odpowiedź PubChem dla hydrochinonu, CID 785)', () => {
  const ghs = parsePubchemGhs(fixture);
  it('odczytuje numer indeksowy i numer WE', () => {
    expect(ghs.indexNumber).toBe('604-005-00-4');
    expect(ghs.ecNumber).toBe('204-617-8');
  });
  it('klasyfikacja zharmonizowana = zał. VI CLP', () => {
    expect(ghs.harmonised?.statements.map((s) => s.code)).toEqual(['H302', 'H317', 'H318', 'H341', 'H351', 'H400']);
  });
  it('zgłoszenia C&L mają odsetki i nie zawierają zwrotów łączonych', () => {
    const codes = ghs.notified!.statements.map((s) => s.code);
    expect(codes).toContain('H410');
    expect(codes.some((c) => c.includes('+'))).toBe(false);
    expect(ghs.notified!.statements.find((s) => s.code === 'H410')!.percent).toBe(21.2);
  });
  it('numer indeksowy wpisu grupowego („…[2]”) jest oczyszczany', () => {
    const grouped = structuredClone(fixture);
    grouped.Record.Reference.find((r) => r.SourceName.startsWith('Regulation'))!.SourceID = '612-123-00-2[2]';
    expect(parsePubchemGhs(grouped).indexNumber).toBe('612-123-00-2');
  });
  it('pusta/nieznana odpowiedź nie wywołuje wyjątku', () => {
    expect(parsePubchemGhs({})).toEqual({ indexNumber: null, ecNumber: null, harmonised: null, notified: null });
    expect(parsePubchemGhs(null).harmonised).toBeNull();
  });
});

describe('candidateClasses', () => {
  it('dopasowanie jednoznaczne', () => {
    expect(candidateClasses('H302')).toEqual(['Acute Tox. 4']);
    expect(candidateClasses('H400')).toEqual(['Aquatic Acute 1']);
  });
  it('zwrot z przyrostkiem dopasowuje się po kodzie bazowym', () => {
    expect(candidateClasses('H360FD')).toEqual(['Repr. 1A', 'Repr. 1B']);
  });
  it('kategorie niejednoznaczne zwracają wszystkie możliwości', () => {
    expect(candidateClasses('H314')).toEqual(['Skin Corr. 1', 'Skin Corr. 1A', 'Skin Corr. 1B', 'Skin Corr. 1C']);
  });
  it('nieznany zwrot → brak propozycji', () => expect(candidateClasses('H999')).toEqual([]));
});
