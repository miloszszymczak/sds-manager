import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildHazards, indexByCas, mergeHazards, normalizeClass, parseAnnexVi, parseLimits } from './annex-vi';
import { readXlsxRows } from '@/server/xlsx';

/** Arkusz w układzie tabeli ECHA (tytuł, dwupoziomowy nagłówek, wiersze z wieloliniowymi komórkami). */
async function echaLikeWorkbook(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Annex VI Table 3');
  ws.addRow(['Table 3: List of harmonised classification and labelling of hazardous substances']);
  ws.addRow([]);
  ws.addRow(['Index No', 'International Chemical Identification', 'EC No', 'CAS No', 'Classification', '', 'Labelling', '', '', 'Specific Conc. Limits, M-factors and ATE', 'Notes', 'ATP inserted / ATP Updated']);
  ws.addRow(['', '', '', '', 'Hazard Class and Category Code(s)', 'Hazard statement Code(s)', 'Pictogram, Signal Word Code(s)', 'Hazard statement Code(s)', 'Suppl. Hazard statement Code(s)', '', '', '']);
  ws.addRow(['011-002-00-6', 'sodium hydroxide; caustic soda', '215-185-5', '1310-73-2', 'Met. Corr. 1\nSkin Corr. 1A', 'H290\nH314', 'GHS05\nDgr', 'H290\nH314', '', 'Skin Corr. 1A; H314: C ≥ 5 %\nSkin Corr. 1B; H314: 2 % ≤ C < 5 %\nSkin Irrit. 2; H315: 0,5 % ≤ C < 2 %\nEye Irrit. 2; H319: 0,5 % ≤ C < 2 %', '', 'ATP01']);
  ws.addRow(['604-005-00-4', '1,4-dihydroxybenzene; hydroquinone; quinol', '204-617-8', '123-31-9', 'Carc. 2\nMuta. 2\nAcute Tox. 4 *\nEye Dam. 1\nSkin Sens. 1\nAquatic Acute 1', 'H351\nH341\nH302\nH318\nH317\nH400', 'GHS08\nGHS05\nGHS07\nGHS09\nDgr', 'H351\nH341\nH302\nH318\nH317\nH400', '', 'M = 10', '', 'ATP09']);
  ws.addRow([
    { richText: [{ text: '005-011-01-1' }] },
    'disodium tetraborate decahydrate; borax decahydrate [1]\ndisodium tetraborate pentahydrate [2]',
    '215-540-4',
    '1303-96-4 [1]\n12179-04-3 [2]',
    'Repr. 1B',
    'H360FD',
    'GHS08\nDgr',
    'H360FD',
    '',
    'Repr. 1B; H360FD: C ≥ 8,5 %',
    '',
    'ATP17',
  ]);
  ws.addRow(['612-004-00-5', 'triethylamine', '204-469-4', '121-44-8', 'Flam. Liq. 2\nAcute Tox. 3\nAcute Tox. 3\nAcute Tox. 4\nSkin Corr. 1A\nSTOT SE 3', 'H225\nH331\nH311\nH302\nH314\nH335', '', '', '', 'inhalation: ATE = 3 mg/L (vapours)\ndermal: ATE = 300 mg/kg bw\noral: ATE = 500 mg/kg bw', '', 'ATP15']);
  ws.addRow(['000-000-00-0', 'brak CAS', '', '—', 'Unknown Class 9', 'H999', '', '', '', '', 'Note A', '']);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

describe('parseAnnexVi (arkusz w układzie ECHA)', async () => {
  const { entries, columns } = parseAnnexVi(await readXlsxRows(await echaLikeWorkbook()));
  const byCas = indexByCas(entries);

  it('rozpoznaje kolumny z dwupoziomowego nagłówka', () => {
    expect(columns.classes).toContain('Hazard Class');
    expect(columns.statements).toContain('Hazard statement');
    expect(columns.limits).toContain('Specific Conc');
    expect(entries).toHaveLength(5);
  });

  it('NaOH: klasy własne z SCL oraz wpisy „tylko SCL”', () => {
    const naoh = byCas.get('1310-73-2')!;
    expect(naoh.indexNumber).toBe('011-002-00-6');
    expect(naoh.hazards).toEqual([
      { hazardClass: 'Met. Corr. 1', statement: 'H290' },
      { hazardClass: 'Skin Corr. 1A', statement: 'H314', sclMin: 5, sclStatement: 'H314' },
      { hazardClass: 'Skin Corr. 1B', statement: 'H314', sclMin: 2, sclStatement: 'H314', limitOnly: true },
      { hazardClass: 'Skin Irrit. 2', statement: 'H315', sclMin: 0.5, sclStatement: 'H315', limitOnly: true },
      { hazardClass: 'Eye Irrit. 2', statement: 'H319', sclMin: 0.5, sclStatement: 'H319', limitOnly: true },
    ]);
  });

  it('hydrochinon: gwiazdka minimalnej klasyfikacji usunięta, M = 10 przy Aquatic Acute 1', () => {
    const hq = byCas.get('123-31-9')!;
    expect(hq.hazards.find((h) => h.hazardClass === 'Acute Tox. 4')).toEqual({ hazardClass: 'Acute Tox. 4', statement: 'H302' });
    expect(hq.hazards.find((h) => h.hazardClass === 'Aquatic Acute 1')?.mFactorAcute).toBe(10);
  });

  it('wpis grupowy: każdy numer CAS wskazuje ten sam wpis, SCL boraksu 8,5 %', () => {
    expect(byCas.get('1303-96-4')).toBe(byCas.get('12179-04-3'));
    expect(byCas.get('1303-96-4')!.hazards).toEqual([{ hazardClass: 'Repr. 1B', statement: 'H360FD', sclMin: 8.5, sclStatement: 'H360FD' }]);
  });

  it('trietyloamina: ATE przypisane do właściwej drogi narażenia', () => {
    const tea = byCas.get('121-44-8')!.hazards;
    expect(tea.find((h) => h.statement === 'H331')?.ateInhalVapour).toBe(3);
    expect(tea.find((h) => h.statement === 'H311')?.ateDermal).toBe(300);
    expect(tea.find((h) => h.statement === 'H302')?.ateOral).toBe(500);
  });

  it('nieznane klasy są raportowane, wpis bez CAS nie trafia do indeksu', () => {
    const odd = entries.find((e) => e.indexNumber === '000-000-00-0')!;
    expect(odd.unknownClasses).toEqual(['Unknown Class 9']);
    expect(odd.casNumbers).toEqual([]);
    expect(odd.notes).toBe('Note A');
  });

  it('arkusz bez nagłówka tabeli → czytelny błąd', () => {
    expect(() => parseAnnexVi([['coś'], ['innego']])).toThrow(/nagłówka/);
  });
});

describe('parseLimits', () => {
  it('współczynniki M osobno dla ostrej i przewlekłej', () => {
    expect(parseLimits('M (acute) = 100\nM (chronic) = 10')).toMatchObject({ mAcute: 100, mChronic: 10 });
    expect(parseLimits('M = 1 000')).toMatchObject({ mAcute: 1000, mChronic: 1000 });
    expect(parseLimits('M = 10 (chronic)')).toMatchObject({ mAcute: null, mChronic: 10 });
  });
  it('ATE dla pyłów i pomijanie gazów', () => {
    expect(parseLimits('inhalation: ATE = 0,5 mg/L (dusts or mists)').ate).toEqual({ inhalDust: 0.5 });
    expect(parseLimits('inhalation: ATE = 100 ppmV (gases)').ate).toEqual({});
  });
  it('SCL ze znakiem „>” i kropką dziesiętną', () => {
    expect(parseLimits('STOT SE 3; H335: C > 10.5 %').scl).toEqual([{ hazardClass: 'STOT SE 3', statement: 'H335', min: 10.5 }]);
  });
});

describe('normalizeClass', () => {
  it('spacje po kropce, gwiazdki i adnotacje w nawiasach', () => {
    expect(normalizeClass('Skin Corr.1A *')).toBe('Skin Corr. 1A');
    expect(normalizeClass('STOT RE 2 **')).toBe('STOT RE 2');
    expect(normalizeClass('Acute Tox. 4 (oral)')).toBe('Acute Tox. 4');
    expect(normalizeClass('Lact.')).toBe('Lact.');
  });
});

describe('buildHazards', () => {
  it('gdy liczba klas i zwrotów się różni — dopasowanie po zwrocie domyślnym', () => {
    const { hazards } = buildHazards('Repr. 1B\nAcute Tox. 4', 'H360FD', '');
    expect(hazards).toEqual([
      { hazardClass: 'Repr. 1B', statement: 'H360FD' },
      { hazardClass: 'Acute Tox. 4', statement: 'H302' },
    ]);
  });
});

describe('mergeHazards', () => {
  it('niczego nie usuwa, uzupełnia SCL/M i dodaje brakujące klasy', () => {
    const existing = [
      { hazardClass: 'Skin Corr. 1A', statement: 'H314' },
      { hazardClass: 'Acute Tox. 4', statement: 'H302', ateOral: 320 },
    ];
    const { hazards, changes } = mergeHazards(existing, [
      { hazardClass: 'Skin Corr. 1A', statement: 'H314', sclMin: 5 },
      { hazardClass: 'Skin Irrit. 2', statement: 'H315', sclMin: 0.5, limitOnly: true },
    ]);
    expect(hazards).toHaveLength(3);
    expect(hazards[0].sclMin).toBe(5);
    expect(hazards[1].ateOral).toBe(320);
    expect(hazards[2]).toMatchObject({ hazardClass: 'Skin Irrit. 2', limitOnly: true });
    expect(changes).toEqual(['Skin Corr. 1A: SCL → 5 %', 'stężenie graniczne Skin Irrit. 2 (SCL 0,5 %)']);
  });
  it('identyczne dane → brak zmian', () => {
    const h = [{ hazardClass: 'Repr. 1B', statement: 'H360FD', sclMin: 8.5, sclStatement: 'H360FD' }];
    expect(mergeHazards(h, h).changes).toEqual([]);
  });
});
