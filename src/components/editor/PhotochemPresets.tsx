'use client';

import { useState } from 'react';
import { presetsForSection, type Preset } from '@/data/photochem-knowledge';

/**
 * Panel wstawiania treści domenowej (A3). Pojawia się w sekcjach, dla których
 * zdefiniowano presety; wstawienie nadpisuje wskazane pole i zapisuje zmianę.
 */
export function PhotochemPresets({
  section,
  onInsert,
}: {
  section: number;
  onInsert: (fieldKey: string, value: string | string[]) => void;
}) {
  const presets = presetsForSection(section);
  const [inserted, setInserted] = useState<string | null>(null);
  if (presets.length === 0) return null;

  const insert = (p: Preset) => {
    onInsert(p.fieldKey, p.value);
    setInserted(p.label);
    setTimeout(() => setInserted(null), 2000);
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span>📓</span>
        <h3 className="text-sm font-semibold text-amber-900">Treści domenowe — fotochemia</h3>
      </div>
      <p className="mb-3 text-xs text-amber-800">
        Gotowe fragmenty do wstawienia. Nadpisują wskazane pole; dostosuj po wstawieniu.
      </p>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => insert(p)}
            className="btn border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
          >
            + {p.label}
          </button>
        ))}
      </div>
      {inserted && <p className="mt-2 text-xs font-medium text-emerald-700">✓ Wstawiono: {inserted}</p>}
    </section>
  );
}
