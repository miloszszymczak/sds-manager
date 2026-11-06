'use client';

import { useState, useTransition } from 'react';
import { computeClassification } from '@/server/actions/documents';
import type { ClassificationSuggestion } from '@/lib/classification/suggest';
import { HAZARD_CLASS_BY_CODE } from '@/data/hazard-classes';
import { PICTOGRAM_BY_CODE } from '@/data/pictograms';

/**
 * Panel silnika klasyfikacji (B1) w sekcji 2.1.
 * „Przelicz z składników" wylicza klasyfikację i pokazuje regułę decydującą
 * dla każdego punktu końcowego; „Zastosuj" nadpisuje sekcję 2 (klasy,
 * piktogramy, hasło, zwroty H). Chemik zawsze decyduje.
 */
export function ClassificationPanel({
  documentId,
  currentClasses,
  onApply,
}: {
  documentId: string;
  currentClasses: string[];
  onApply: (classes: string[], statements: string[]) => Promise<void> | void;
}) {
  const [result, setResult] = useState<ClassificationSuggestion | null>(null);
  const [computing, startCompute] = useTransition();
  const [applying, startApply] = useTransition();
  const [applied, setApplied] = useState(false);

  const compute = () =>
    startCompute(async () => {
      setApplied(false);
      setResult(await computeClassification(documentId));
    });

  const current = new Set(currentClasses);
  const suggested = new Set(result?.hazardClasses ?? []);
  const added = [...suggested].filter((x) => !current.has(x));
  const removed = [...current].filter((x) => !suggested.has(x));

  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-brand-900">
            <span>⚗</span> Silnik klasyfikacji mieszaniny
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            Wylicza klasyfikację CLP ze składników sekcji 3 i pokazuje regułę decydującą. Zweryfikuj przed zastosowaniem.
          </p>
        </div>
        <button onClick={compute} disabled={computing} className="btn-primary">
          {computing ? 'Przeliczam…' : 'Przelicz z składników'}
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-4">
          {/* Podsumowanie różnicy */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {added.length === 0 && removed.length === 0 ? (
              <span className="badge bg-emerald-100 text-emerald-800">✓ Zgodne z bieżącą klasyfikacją</span>
            ) : (
              <>
                {added.map((c) => (
                  <span key={c} className="badge bg-emerald-100 text-emerald-800" title={HAZARD_CLASS_BY_CODE.get(c)?.namePl}>
                    + {c}
                  </span>
                ))}
                {removed.map((c) => (
                  <span key={c} className="badge bg-red-100 text-red-700" title="Brak w wyliczeniu">
                    − {c}
                  </span>
                ))}
              </>
            )}
          </div>

          {/* Tabela punktów końcowych */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="px-3 py-2">Punkt końcowy</th>
                  <th className="px-3 py-2">Wynik</th>
                  <th className="px-3 py-2">Reguła decydująca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.endpoints.map((e, i) => (
                  <tr key={i} className={e.hazardClass ? '' : 'text-slate-400'}>
                    <td className="px-3 py-2">{e.endpoint}</td>
                    <td className="px-3 py-2">
                      {e.hazardClass ? (
                        <span className="font-medium text-slate-800">
                          {e.hazardClass}
                          {e.statement && <span className="ml-1 font-mono text-xs text-brand-700">{e.statement}</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400">brak</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {e.rule}
                      {e.contributors.length > 0 && (
                        <span className="text-slate-400"> · {e.contributors.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Podgląd oznakowania wynikowego */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Piktogramy:</span>
              {result.pictograms.length === 0 && <span className="text-slate-400">brak</span>}
              {result.pictograms.map((p) => (
                <span key={p} className="inline-block h-7 w-7" dangerouslySetInnerHTML={{ __html: PICTOGRAM_BY_CODE.get(p)?.svg ?? '' }} />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Hasło:</span>
              <strong className={result.signalWord === 'NIEBEZPIECZEŃSTWO' ? 'text-red-700' : 'text-slate-700'}>
                {result.signalWord ?? 'brak'}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                startApply(async () => {
                  try {
                    await onApply(result.hazardClasses, result.statements);
                    setApplied(true);
                  } catch {
                    // komunikat pokazuje warstwa zapisu
                  }
                })
              }
              disabled={applying}
              className="btn-primary"
            >
              {applying ? 'Stosuję…' : 'Zastosuj do sekcji 2'}
            </button>
            {applied && <span className="text-sm font-medium text-emerald-600">✓ Zastosowano</span>}
            <span className="text-xs text-slate-400">Nadpisuje klasy, piktogramy, hasło i zwroty H.</span>
          </div>
        </div>
      )}
    </section>
  );
}
