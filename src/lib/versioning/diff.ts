/**
 * Porównanie dwóch migawek dokumentu (F4.1). Czyste funkcje.
 *
 * Migawka to `{ sections: {n: data}, components: [...], meta: {...} }`.
 * Diff wskazuje, które sekcje i pola się zmieniły — na tej podstawie
 * generujemy wpis „zmiany względem poprzedniej wersji" w sekcji 16.
 */

export interface Snapshot {
  meta: { version: string; productName: string; ufi: string | null };
  sections: Record<number, Record<string, unknown>>;
  components: { name: string; concentration: string | null; hazardClasses: string[] }[];
}

export interface FieldChange {
  section: number;
  field: string;
  kind: 'added' | 'removed' | 'changed';
}

export interface SnapshotDiff {
  sectionChanges: FieldChange[];
  componentsChanged: boolean;
  metaChanged: string[];
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const isEmpty = (v: unknown) =>
  v == null ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

/** Porównuje starą (`from`) i nową (`to`) migawkę. */
export function diffSnapshots(from: Snapshot, to: Snapshot): SnapshotDiff {
  const sectionChanges: FieldChange[] = [];

  for (let n = 1; n <= 16; n++) {
    const a = from.sections[n] ?? {};
    const b = to.sections[n] ?? {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const field of keys) {
      if (eq(a[field], b[field])) continue;
      const inA = !isEmpty(a[field]);
      const inB = !isEmpty(b[field]);
      sectionChanges.push({
        section: n,
        field,
        kind: inA && inB ? 'changed' : inB ? 'added' : 'removed',
      });
    }
  }

  const metaChanged: string[] = [];
  if (from.meta.version !== to.meta.version) metaChanged.push('wersja');
  if (from.meta.productName !== to.meta.productName) metaChanged.push('nazwa produktu');
  if ((from.meta.ufi ?? '') !== (to.meta.ufi ?? '')) metaChanged.push('UFI');

  return {
    sectionChanges,
    componentsChanged: !eq(from.components, to.components),
    metaChanged,
  };
}

/** Zwięzły opis zmian (do sekcji 16 „zmiany względem poprzedniej wersji"). */
export function summarizeDiff(diff: SnapshotDiff): string {
  const parts: string[] = [];
  const bySection = new Map<number, number>();
  for (const c of diff.sectionChanges) bySection.set(c.section, (bySection.get(c.section) ?? 0) + 1);
  if (bySection.size > 0) {
    const list = [...bySection.keys()].sort((a, b) => a - b).join(', ');
    parts.push(`zmiany w sekcjach: ${list}`);
  }
  if (diff.componentsChanged) parts.push('zmiana składu (sekcja 3)');
  if (diff.metaChanged.length) parts.push(`zmiana: ${diff.metaChanged.join(', ')}`);
  return parts.length ? parts.join('; ') + '.' : 'brak istotnych zmian.';
}
