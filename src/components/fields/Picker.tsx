'use client';

import { useMemo, useRef, useState, useEffect } from 'react';

export interface PickerOption {
  value: string;
  /** Krótki kod pokazywany wytłuszczony (np. H302) */
  code?: string;
  label: string;
  /** Dodatkowy opis w drugiej linii */
  hint?: string;
  group?: string;
  /** Opcjonalny znacznik, np. piktogram SVG */
  glyph?: string;
}

/**
 * Uniwersalny multi-select z wyszukiwarką.
 * Używany dla zwrotów H/P, klas zagrożenia, kodów odpadów i podstaw prawnych.
 * Wybrane pozycje pokazywane są jako „chipsy” — usuwalne jednym kliknięciem.
 */
export function Picker({
  options,
  selected,
  onChange,
  placeholder = 'Szukaj i wybierz…',
  emptyText = 'Nic nie wybrano',
  renderChip,
}: {
  options: PickerOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  renderChip?: (opt: PickerOption) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.code?.toLowerCase().includes(q) ||
            o.value.toLowerCase().includes(q) ||
            o.hint?.toLowerCase().includes(q),
        )
      : options;
    // Grupowanie z zachowaniem kolejności
    const groups = new Map<string, PickerOption[]>();
    for (const o of list) {
      const g = o.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(o);
    }
    return groups;
  }, [options, query]);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div ref={boxRef} className="relative">
      {/* Wybrane */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {selected.length === 0 && <span className="text-sm text-slate-400 italic">{emptyText}</span>}
        {selected.map((v) => {
          const opt = byValue.get(v);
          if (!opt) {
            return (
              <span key={v} className="badge bg-red-50 text-red-700" title="Nieznana pozycja">
                {v}
                <button onClick={() => toggle(v)} className="ml-0.5 hover:text-red-900">
                  ×
                </button>
              </span>
            );
          }
          if (renderChip) return <span key={v}>{renderChip(opt)}</span>;
          return (
            <span
              key={v}
              className="group inline-flex max-w-full items-start gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs"
              title={opt.label}
            >
              {opt.code && <strong className="shrink-0 font-semibold text-brand-800">{opt.code}</strong>}
              <span className="truncate text-slate-700">{opt.label}</span>
              <button
                onClick={() => toggle(v)}
                className="shrink-0 text-slate-400 transition group-hover:text-red-600"
                aria-label={`Usuń ${opt.code ?? opt.label}`}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>

      <button type="button" onClick={() => setOpen((o) => !o)} className="btn-outline w-full justify-between">
        <span className="text-slate-500">{placeholder}</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 max-h-96 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtruj po kodzie lub treści…"
              className="field"
            />
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {[...filtered.entries()].map(([group, items]) => (
              <div key={group}>
                {group && (
                  <div className="sticky top-0 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    {group}
                  </div>
                )}
                {items.map((o) => {
                  const isSel = selected.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggle(o.value)}
                      className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition hover:bg-brand-50 ${
                        isSel ? 'bg-brand-50/70' : ''
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] ${
                          isSel ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSel ? '✓' : ''}
                      </span>
                      {o.glyph && (
                        <span
                          className="h-8 w-8 shrink-0"
                          dangerouslySetInnerHTML={{ __html: o.glyph }}
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        {o.code && <strong className="mr-1.5 font-semibold text-slate-900">{o.code}</strong>}
                        <span className="text-sm text-slate-700">{o.label}</span>
                        {o.hint && <span className="mt-0.5 block text-xs text-slate-400">{o.hint}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
            {[...filtered.values()].flat().length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-400">Brak pasujących pozycji</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
