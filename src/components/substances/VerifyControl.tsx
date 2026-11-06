'use client';

import { useTransition } from 'react';
import { markSubstanceVerified } from '@/server/actions/substances';
import { attempt } from '@/components/ui/toast';
import { freshnessOf, FRESHNESS_LABEL, STALE_AFTER_DAYS } from '@/lib/freshness';

const STYLE: Record<string, string> = {
  never: 'bg-slate-100 text-slate-600',
  fresh: 'bg-emerald-100 text-emerald-800',
  stale: 'bg-amber-100 text-amber-800',
};

/** Znacznik aktualności danych regulacyjnych substancji + przycisk weryfikacji (F4.2). */
export function VerifyControl({
  cas,
  lastVerified,
  sourceRef,
}: {
  cas: string;
  lastVerified: string | null;
  sourceRef: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const f = freshnessOf(lastVerified);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`badge ${STYLE[f]}`}>Dane regulacyjne: {FRESHNESS_LABEL[f]}</span>
      {lastVerified && (
        <span className="text-xs text-slate-500">
          ostatnia weryfikacja: {new Date(lastVerified).toLocaleDateString('pl-PL')}
          {sourceRef ? ` · ${sourceRef}` : ''}
        </span>
      )}
      {f !== 'fresh' && (
        <span className="text-xs text-slate-400">
          Zweryfikuj klasyfikację (ECHA C&amp;L, lista SVHC) co najmniej co {STALE_AFTER_DAYS} dni.
        </span>
      )}
      <button
        disabled={pending}
        onClick={() => startTransition(async () => void (await attempt(markSubstanceVerified(cas, `ręczna weryfikacja ${new Date().toISOString().slice(0, 10)}`), 'Oznaczono jako zweryfikowane.')))}
        className="btn-outline ml-auto"
      >
        {pending ? 'Zapisuję…' : 'Oznacz jako zweryfikowane'}
      </button>
    </div>
  );
}
