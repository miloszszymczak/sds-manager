'use client';

import { useState, useTransition } from 'react';
import { publishVersion } from '@/server/actions/documents';
import { attempt } from '@/components/ui/toast';

/** Kontrolka wydania nowej wersji dokumentu (F4.1). */
export function PublishVersion({ documentId, currentVersion }: { documentId: string; currentVersion: string }) {
  const [version, setVersion] = useState(bump(currentVersion));
  const [note, setNote] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Wydaj nową wersję</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Bieżąca wersja: <strong>{currentVersion}</strong>. Zapisze migawkę i opis zmian.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nowa wersja</label>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div className="min-w-64 flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Notatka (opcjonalnie)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="np. aktualizacja klasyfikacji części B"
            className="field"
          />
        </div>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const change = await attempt(publishVersion(documentId, version, note));
              if (change === undefined) return;
              setResult(change);
              setNote('');
              setVersion(bump(version));
            })
          }
          className="btn-primary h-[38px]"
        >
          {pending ? 'Wydaję…' : 'Wydaj wersję'}
        </button>
      </div>
      {result && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          ✓ Wydano wersję. Zmiany: {result}
        </p>
      )}
    </div>
  );
}

/** Podbija ostatni człon numeru wersji (1.0 → 1.1). */
function bump(v: string): string {
  const m = v.match(/^(.*?)(\d+)$/);
  if (!m) return v;
  return `${m[1]}${Number(m[2]) + 1}`;
}
