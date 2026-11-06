'use client';

import { useMemo, useState } from 'react';

export interface SubstanceOption {
  cas: string;
  name: string;
}

/** Wyszukiwarka substancji (nazwa lub CAS) — wybór jednej pozycji. */
export function SubstanceSelect({
  options,
  onSelect,
  exclude = [],
  placeholder = 'Dodaj substancję — wpisz nazwę lub CAS…',
}: {
  options: SubstanceOption[];
  onSelect: (cas: string) => void;
  exclude?: string[];
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const skip = new Set(exclude);
    return options
      .filter((o) => !skip.has(o.cas) && (!needle || o.name.toLowerCase().includes(needle) || o.cas.includes(needle)))
      .slice(0, 50);
  }, [options, q, exclude]);

  return (
    <div className="relative">
      <input
        className="field"
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {hits.map((o) => (
            <button
              key={o.cas}
              type="button"
              className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(o.cas);
                setQ('');
                setOpen(false);
              }}
            >
              <span className="font-medium text-slate-800">{o.name}</span>
              <span className="font-mono text-xs text-slate-400">{o.cas}</span>
            </button>
          ))}
          {hits.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">Brak pasujących substancji.</p>}
        </div>
      )}
    </div>
  );
}
