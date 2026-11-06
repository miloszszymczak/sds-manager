'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { addDocumentComponent, updateDocumentComponent, deleteDocumentComponent } from '@/server/actions/documents';
import { attempt } from '@/components/ui/toast';
import { SubstanceSelect, type SubstanceOption } from '@/components/ui/SubstanceSelect';
import { Picker, type PickerOption } from './Picker';
import { HAZARD_CLASSES } from '@/data/hazard-classes';
import { HAZARD_STATEMENTS } from '@/data/hazard-statements';

export interface ComponentRow {
  id: string;
  name: string;
  casNumber: string | null;
  ecNumber: string | null;
  indexNumber: string | null;
  reachNumber: string | null;
  concentration: string | null;
  hazardClasses: string[];
  hazardStatements: string[];
  sclNotes: string | null;
  isSvhc: boolean;
}

export type { SubstanceOption };

/**
 * Edytor składników mieszaniny (sekcja 3.2).
 * Każdy składnik to rozwijana karta — identyfikatory w siatce,
 * klasyfikacja przez multi-select ze słownika CLP.
 */
export function ComponentsField({
  documentId,
  components,
  substances,
}: {
  documentId: string;
  components: ComponentRow[];
  substances: SubstanceOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(components[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {components.map((c, idx) => (
        <ComponentCard
          key={c.id}
          index={idx}
          component={c}
          expanded={expanded === c.id}
          onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
        />
      ))}

      {components.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
          Mieszanina nie ma jeszcze składników.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-72 flex-1">
          <SubstanceSelect
            options={substances}
            exclude={components.map((c) => c.casNumber ?? '')}
            onSelect={(cas) => startTransition(async () => void (await attempt(addDocumentComponent(documentId, cas))))}
          />
        </div>
        <button
          className="btn-ghost"
          disabled={pending}
          onClick={() => startTransition(async () => void (await attempt(addDocumentComponent(documentId))))}
        >
          + Pusty wiersz
        </button>
      </div>
    </div>
  );
}

function ComponentCard({
  component,
  index,
  expanded,
  onToggle,
}: {
  component: ComponentRow;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [c, setC] = useState(component);
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(c);

  const persist = useCallback((row: ComponentRow) => {
    startTransition(async () => {
      const ok = await attempt(
        updateDocumentComponent(row.id, {
          name: row.name,
          casNumber: row.casNumber || null,
          ecNumber: row.ecNumber || null,
          indexNumber: row.indexNumber || null,
          reachNumber: row.reachNumber || null,
          concentration: row.concentration || null,
          hazardClasses: row.hazardClasses,
          hazardStatements: row.hazardStatements,
          sclNotes: row.sclNotes || null,
          isSvhc: row.isSvhc,
        }),
      );
      if (ok === undefined) return;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }, []);

  /**
   * Aktualizacja z debounce: pola tekstowe zapisują się po chwili bezczynności,
   * a wybory (checkbox, listy klas/zwrotów) natychmiast. Zapis w tle nie
   * odświeża strony, więc pisanie jest płynne.
   */
  const commit = (patch: Partial<ComponentRow>, immediate = false) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setC(next);
    if (timer.current) clearTimeout(timer.current);
    if (immediate) {
      persist(next);
    } else {
      timer.current = setTimeout(() => persist(next), 600);
    }
  };

  // Zapis niezapisanych zmian przy odmontowaniu (np. zwinięcie/usunięcie karty).
  useEffect(() => {
    latest.current = c;
  }, [c]);
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        persist(latest.current);
      }
    },
    [persist],
  );

  const classOptions: PickerOption[] = HAZARD_CLASSES.map((h) => ({
    value: h.code,
    code: h.code,
    label: `${h.namePl} — ${h.categoryPl}`,
  }));
  const statementOptions: PickerOption[] = HAZARD_STATEMENTS.map((h) => ({
    value: h.code,
    code: h.code,
    label: h.textPl,
  }));

  const field = (label: string, key: keyof ComponentRow, placeholder?: string) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        className="field"
        placeholder={placeholder}
        value={(c[key] as string) ?? ''}
        onChange={(e) => commit({ [key]: e.target.value } as Partial<ComponentRow>)}
      />
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-100 text-xs font-semibold text-slate-500">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-900">{c.name || '— bez nazwy —'}</span>
            <span className="mt-0.5 block truncate font-mono text-xs text-slate-400">
              {[c.casNumber && `CAS ${c.casNumber}`, c.concentration && `${c.concentration} %`]
                .filter(Boolean)
                .join(' · ') || 'brak identyfikatorów'}
            </span>
          </span>
          {c.isSvhc && <span className="badge shrink-0 bg-red-100 text-red-700">SVHC</span>}
          {c.hazardStatements.length > 0 && (
            <span className="badge shrink-0 bg-amber-100 text-amber-800">
              {c.hazardStatements.length} zwrotów H
            </span>
          )}
        </button>
        {saved && <span className="text-xs font-medium text-emerald-600">✓</span>}
        <button onClick={onToggle} className="btn-ghost shrink-0 px-2">
          {expanded ? '▲' : '▼'}
        </button>
        <button
          className="btn-danger shrink-0 px-2"
          title="Usuń składnik"
          onClick={() =>
            confirm(`Usunąć składnik „${c.name || 'bez nazwy'}” z karty?`) &&
            startTransition(async () => void (await attempt(deleteDocumentComponent(component.id))))
          }
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">{field('Nazwa składnika', 'name')}</div>
            {field('Numer CAS', 'casNumber', '123-31-9')}
            {field('Numer WE', 'ecNumber', '204-617-8')}
            {field('Numer indeksowy', 'indexNumber', '604-005-00-4')}
            {field('Numer rejestracji REACH', 'reachNumber', '01-…')}
            {field('Zawartość [% m/m]', 'concentration', '70-80')}
            {field('Specyficzne stężenia graniczne / współczynnik M', 'sclNotes', 'M = 10')}
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={c.isSvhc}
              onChange={(e) => commit({ isSvhc: e.target.checked }, true)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            <span className="text-sm text-slate-700">
              Substancja z listy kandydackiej SVHC <span className="text-slate-400">(art. 33 REACH)</span>
            </span>
          </label>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Klasy zagrożenia</label>
            <Picker
              options={classOptions}
              selected={c.hazardClasses}
              onChange={(next) => commit({ hazardClasses: next }, true)}
              placeholder="Dodaj klasę zagrożenia…"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Zwroty H składnika</label>
            <Picker
              options={statementOptions}
              selected={c.hazardStatements}
              onChange={(next) => commit({ hazardStatements: next }, true)}
              placeholder="Dodaj zwrot H…"
            />
          </div>
        </div>
      )}
    </div>
  );
}

