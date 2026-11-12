import 'server-only';
import ExcelJS from 'exceljs';

/** Tekst komórki niezależnie od typu (tekst sformatowany, formuła, hiperłącze, liczba). */
function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if ('richText' in v) return v.richText.map((t) => t.text).join('');
  if ('text' in v && typeof v.text === 'string') return v.text;
  if ('result' in v) return cellText(v.result as ExcelJS.CellValue);
  return '';
}

/** Wiersze arkusza (domyślnie: pierwszy, który zawiera dane) jako macierz tekstów. */
export async function readXlsxRows(data: ArrayBuffer, pickSheet?: (names: string[]) => number): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const sheets = wb.worksheets;
  if (sheets.length === 0) throw new Error('Plik nie zawiera arkuszy.');
  const sheet = sheets[pickSheet ? pickSheet(sheets.map((s) => s.name)) : 0] ?? sheets[0];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, n) => {
    const values = row.values as ExcelJS.CellValue[]; // indeks 0 jest pusty (kolumny od 1)
    rows[n - 1] = values.slice(1).map(cellText);
  });
  return Array.from(rows, (r) => r ?? []);
}
