import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildEsdscom, concentrationRange, esdscomClasses, type EsdscomInput } from './esdscom';
import { SECTIONS, emptySectionData } from './schema/sections';

/** Karta z wypełnionym każdym polem schematu sekcji — sprawdza wszystkie ścieżki eksportu. */
function fullInput(): EsdscomInput {
  const sections: Record<number, Record<string, unknown>> = {};
  for (const s of SECTIONS) {
    const data = emptySectionData(s.number);
    for (const sub of s.subsections)
      for (const f of sub.fields) {
        const sample = `Treść ${f.key} <&> „cudzysłów” ${'długi tekst '.repeat(f.type === 'textarea' ? 120 : 1)}`;
        if (f.type === 'text' || f.type === 'textarea') data[f.key] = `${sample}\n\nDrugi akapit.`;
        else if (f.type === 'list') data[f.key] = ['pierwsza pozycja', 'druga pozycja'];
        else if (f.type === 'keyValue') data[f.key] = Object.fromEntries((f.rows ?? []).map((r) => [r.key, `${r.label}: wartość`]));
        else if (f.type === 'table') data[f.key] = [Object.fromEntries((f.columns ?? []).map((c) => [c.key, `${c.label} 1`]))];
      }
    sections[s.number] = data;
  }
  sections[1].dostawca = { przedsiebiorstwo: 'ACME sp. z o.o.', adres: 'ul. Długa 1, 00-001 Warszawa', telefon: '+48 22 000 00 00', email: 'sds@acme.pl', www: 'acme.pl', bdo: '000' };
  sections[1].telefonyAlarmowe = [{ nazwa: 'Centrum', numer: '112', uwagi: '24/7' }, { nazwa: '', numer: '', uwagi: '' }];
  (sections[1].identyfikator as Record<string, string>).ufi = 'JXR2-K0MV-900S-YSDM';
  Object.assign(sections[2], {
    klasyfikacja: ['Acute Tox. 3', 'Skin Corr. 1B', 'STOT SE 3', 'Repr. 1B', 'Aquatic Chronic 2', 'Nieznana klasa'],
    piktogramy: ['GHS05', 'GHS06', 'GHS08', 'GHS09'],
    hasloOstrzegawcze: 'NIEBEZPIECZEŃSTWO',
    zwrotyH: ['H311', 'H331', 'H314', 'H335', 'H360FD', 'H411', 'EUH031', 'EUH208'],
    zwrotyP: ['P201', 'P280', 'P305+P351+P338', 'P303+P361+P353', 'P501'],
  });
  sections[13].kodyOdpadow = ['09 01 01*', '15 01 02', 'zły kod'];
  sections[14].transport = { niePodlega: false, mody: { adr: { un: '1824', klasa: '8' } } };
  sections[15].przepisy = ['l1', 'brak'];
  return {
    documentId: 'doc1',
    productName: 'Produkt testowy & <spółka>',
    version: '2.1',
    issueDate: new Date('2026-01-02'),
    revisionDate: new Date('2026-03-04'),
    ufi: null,
    sections,
    components: [
      { name: 'Wodorotlenek sodu', casNumber: '1310-73-2', ecNumber: '215-185-5', indexNumber: '011-002-00-6', reachNumber: null, concentration: '2-5', hazardClasses: ['Skin Corr. 1A'], hazardStatements: ['H314'] },
      { name: 'Ślad', casNumber: 'zły', ecNumber: null, indexNumber: null, reachNumber: null, concentration: '< 0,1', hazardClasses: ['Acute Tox. 4'], hazardStatements: ['H302', 'H332'] },
      { name: 'Bez stężenia', casNumber: null, ecNumber: null, indexNumber: null, reachNumber: '01-2119537420-49-XXXX', concentration: null, hazardClasses: [], hazardStatements: [] },
    ],
    wasteCatalog: [{ code: '09 01 01*', descriptionPl: 'Wodne roztwory wywoływaczy', isHazardous: true }],
    legalCatalog: [{ id: 'l1', title: 'Rozporządzenie (WE) nr 1907/2006', journalRef: 'Dz.U. UE L 396' }],
    generatedAt: new Date('2026-11-12T10:00:00Z'),
  };
}

function xmllint(xml: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'esdscom-'));
  try {
    writeFileSync(join(dir, 'sds.xml'), xml);
    return execFileSync('xmllint', ['--noout', '--schema', join(__dirname, '../../vendor/esdscom/SDSComXML.xsd'), join(dir, 'sds.xml')], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const hasXmllint = (() => {
  try {
    execFileSync('xmllint', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('eksport eSDScom XML', () => {
  it.skipIf(!hasXmllint)('karta z wypełnionymi wszystkimi polami jest zgodna ze schematem eSDScom 5.6', () => {
    expect(() => xmllint(buildEsdscom(fullInput()))).not.toThrow();
  });

  it.skipIf(!hasXmllint)('minimalna karta (puste sekcje, brak składników) też jest zgodna', () => {
    const input = fullInput();
    input.sections = {};
    input.components = [];
    expect(() => xmllint(buildEsdscom(input))).not.toThrow();
  });

  it('mapuje klasyfikację, oznakowanie i skład', () => {
    const xml = buildEsdscom(fullInput());
    expect(xml).toContain('<HazardClassCategory>Acute Tox. 3 (dermal)</HazardClassCategory>');
    expect(xml).toContain('<HazardClassCategory>Acute Tox. 3 (inhalation)</HazardClassCategory>');
    expect(xml).toContain('<HazardClassCategory>STOT SE 3 (resp.)</HazardClassCategory>');
    expect(xml).not.toContain('Nieznana klasa</HazardClassCategory>');
    expect(xml).toContain('<PhraseCode>360FD</PhraseCode>');
    expect(xml).toContain('<PrecautionaryStatement><PhraseCode>305</PhraseCode><PhraseCode>351</PhraseCode><PhraseCode>338</PhraseCode>');
    expect(xml).toContain('<SupplementalHazardInformation><PhraseCode>031</PhraseCode>');
    expect(xml).toContain('<SignalWord><PhraseCode>DGR</PhraseCode>');
    expect(xml).toContain('<WasteCode>09 01 01</WasteCode>');
    expect(xml).toContain('<HazardousWaste>true</HazardousWaste>');
    expect(xml).toContain('<Ufi>JXR2-K0MV-900S-YSDM</Ufi>');
    expect(xml).toContain('Produkt testowy &amp; &lt;spółka&gt;');
  });

  it.skipIf(!hasXmllint)('kilka kart w jednym pliku (zestaw produktu)', () => {
    const xml = buildEsdscom([fullInput(), { ...fullInput(), documentId: 'doc2' }]);
    expect(xml.match(/<Datasheet>/g)).toHaveLength(2);
    expect(() => xmllint(xml)).not.toThrow();
  });

  it('długie teksty dzielone są na frazy ≤ 1024 znaki', () => {
    const xml = buildEsdscom(fullInput());
    const longest = Math.max(...[...xml.matchAll(/<FullText>([^<]*)<\/FullText>/g)].map((m) => m[1].length));
    expect(longest).toBeLessThanOrEqual(1024 + 40); // encje XML wydłużają zapis
  });
});

describe('concentrationRange', () => {
  it('wartość dokładna, zakres i granice', () => {
    expect(concentrationRange('71,4')).toContain('<ExactValue>71.4</ExactValue>');
    expect(concentrationRange('70-80')).toBe(
      '<UpperValueSymbol>le</UpperValueSymbol><UpperValue>80</UpperValue><LowerValueSymbol>ge</LowerValueSymbol><LowerValue>70</LowerValue><Unit>%</Unit>',
    );
    expect(concentrationRange('< 0,1')).toContain('<UpperValueSymbol>lt</UpperValueSymbol><UpperValue>0.1</UpperValue>');
    expect(concentrationRange('≥ 10 %')).toContain('<LowerValueSymbol>ge</LowerValueSymbol><LowerValue>10</LowerValue>');
  });
});

describe('esdscomClasses', () => {
  it('toksyczność ostra: droga ze zwrotów H, domyślnie pokarmowa', () => {
    expect(esdscomClasses('Acute Tox. 4', ['H302', 'H312'])).toEqual(['Acute Tox. 4 (oral)', 'Acute Tox. 4 (dermal)']);
    expect(esdscomClasses('Acute Tox. 4', ['H332'])).toEqual(['Acute Tox. 4 (inhalation)']);
    expect(esdscomClasses('Acute Tox. 3', ['H302'])).toEqual(['Acute Tox. 3 (oral)']);
  });
  it('STOT SE 3 wg działania', () => {
    expect(esdscomClasses('STOT SE 3', ['H336'])).toEqual(['STOT SE 3 (narc.)']);
    expect(esdscomClasses('STOT SE 3', ['H335', 'H336'])).toEqual(['STOT SE 3 (resp., narc.)']);
  });
  it('pozostałe klasy bez zmian, nieznane pomijane', () => {
    expect(esdscomClasses('Repr. 1B', [])).toEqual(['Repr. 1B']);
    expect(esdscomClasses('Coś', [])).toEqual([]);
  });
});
