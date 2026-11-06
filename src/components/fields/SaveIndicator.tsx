'use client';

import type { SaveState } from './useAutosave';

/** Dyskretny wskaźnik stanu autozapisu przy etykiecie pola. */
export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const map = {
    pending: { text: 'Zapisywanie…', cls: 'text-slate-400' },
    saved: { text: '✓ Zapisano', cls: 'text-emerald-600' },
    error: { text: '⚠ Błąd zapisu', cls: 'text-red-600' },
  } as const;
  const m = map[state];
  return <span className={`text-xs font-medium ${m.cls}`}>{m.text}</span>;
}
