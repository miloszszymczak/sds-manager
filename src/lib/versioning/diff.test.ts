import { describe, it, expect } from 'vitest';
import { diffSnapshots, summarizeDiff, type Snapshot } from './diff';

const base: Snapshot = {
  meta: { version: '1.0', productName: 'D-76 A', ufi: 'X' },
  sections: { 2: { hasloOstrzegawcze: 'NIEBEZPIECZEŃSTWO', klasyfikacja: ['Carc. 2'] }, 9: { wlasciwosci: { pH: '3,5' } } },
  components: [{ name: 'hydrochinon', concentration: '71,4', hazardClasses: ['Carc. 2'] }],
};

describe('diff migawek', () => {
  it('brak zmian → pusty diff', () => {
    const d = diffSnapshots(base, structuredClone(base));
    expect(d.sectionChanges).toHaveLength(0);
    expect(d.componentsChanged).toBe(false);
    expect(summarizeDiff(d)).toContain('brak istotnych zmian');
  });

  it('zmiana pola sekcji jest wykrywana jako „changed"', () => {
    const to = structuredClone(base);
    to.sections[9].wlasciwosci = { pH: '4,0' };
    const d = diffSnapshots(base, to);
    expect(d.sectionChanges).toEqual([{ section: 9, field: 'wlasciwosci', kind: 'changed' }]);
  });

  it('dodanie nowego pola → „added", usunięcie → „removed"', () => {
    const to = structuredClone(base);
    to.sections[2].zwrotyH = ['H351'];
    (to.sections[2] as Record<string, unknown>).klasyfikacja = [];
    const d = diffSnapshots(base, to);
    expect(d.sectionChanges).toContainEqual({ section: 2, field: 'zwrotyH', kind: 'added' });
    expect(d.sectionChanges).toContainEqual({ section: 2, field: 'klasyfikacja', kind: 'removed' });
  });

  it('zmiana składu i metadanych', () => {
    const to = structuredClone(base);
    to.components[0].concentration = '70';
    to.meta.version = '1.1';
    const d = diffSnapshots(base, to);
    expect(d.componentsChanged).toBe(true);
    expect(d.metaChanged).toContain('wersja');
    expect(summarizeDiff(d)).toContain('zmiana składu');
  });
});
