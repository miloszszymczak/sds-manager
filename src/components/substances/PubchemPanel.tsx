'use client';

import { useMemo, useState, useTransition } from 'react';
import { lookupSubstanceData, replaceSubstanceHazards, updateSubstance, type HazardInput } from '@/server/actions/substances';
import type { PubchemSubstance } from '@/server/pubchem';
import { candidateClasses, type GhsSource } from '@/lib/pubchem';
import { HAZARD_STATEMENT_BY_CODE } from '@/data/hazard-statements';
import { attempt } from '@/components/ui/toast';

interface Current {
  nameEn: string | null;
  ecNumber: string | null;
  indexNumber: string | null;
  molecularFormula: string | null;
  molarMass: string | null;
}

type IdKey = keyof Current;

const ID_LABEL: Record<IdKey, string> = {
  nameEn: 'Nazwa angielska',
  ecNumber: 'Numer WE',
  indexNumber: 'Numer indeksowy',
  molecularFormula: 'Wzór sumaryczny',
  molarMass: 'Masa molowa',
};

/**
 * Propozycja danych z PubChem: identyfikatory oraz klasyfikacja (zał. VI CLP, a gdy
 * jej brak — zgłoszenia C&L). Nic nie zapisuje się samo: chemik wybiera, co przyjąć.
 */
export function PubchemPanel({ cas, current, hazards }: { cas: string; current: Current; hazards: HazardInput[] }) {
  const [data, setData] = useState<PubchemSubstance | null>(null);
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<Record<string, string>>({});

  const proposals = useMemo(() => {
    if (!data) return [];
    const proposed: Record<IdKey, string | null> = {
      nameEn: data.title,
      ecNumber: data.ecNumber,
      indexNumber: data.indexNumber,
      molecularFormula: data.molecularFormula,
      molarMass: data.molarMass,
    };
    return (Object.keys(ID_LABEL) as IdKey[])
      .map((key) => {
        const cur = current[key];
        // Nazwa i wzór z PubChem (tytuł rekordu, notacja Hilla) bywają mniej czytelne niż wpisane ręcznie —
        // proponujemy je tylko, gdy pole jest puste.
        const keepOwn = (key === 'nameEn' || key === 'molecularFormula') && !!cur;
        return { key, proposed: proposed[key], current: cur, same: keepOwn || (cur ?? '') === proposed[key], keepOwn };
      })
      .filter((p) => p.proposed);
  }, [data, current]);

  const source: GhsSource | null = data?.harmonised ?? data?.notified ?? null;
  const existing = new Set(hazards.map((h) => h.hazardClass));
  const rows = (source?.statements ?? []).map((s) => {
    const candidates = candidateClasses(s.code);
    // brak decyzji użytkownika → dopasowanie jednoznaczne jest zaznaczone domyślnie
    return { ...s, candidates, choice: picked[s.code] ?? (candidates.length === 1 ? candidates[0] : '') };
  });
  const toAdd = rows.filter((r) => r.choice && !existing.has(r.choice));

  const load = () =>
    startTransition(async () => {
      const r = await attempt(lookupSubstanceData(cas));
      if (r) setData(r);
    });

  const applyIds = (keys: IdKey[]) =>
    startTransition(async () => {
      const patch = Object.fromEntries(proposals.filter((p) => keys.includes(p.key)).map((p) => [p.key, p.proposed]));
      if ((await attempt(updateSubstance(cas, patch), 'Zapisano identyfikatory.')) !== undefined) window.location.reload();
    });

  const addClasses = () =>
    startTransition(async () => {
      const added: HazardInput[] = toAdd.map((r) => ({
        hazardClass: r.choice,
        statement: r.code,
        note: source?.kind === 'harmonised' ? 'PubChem: zał. VI CLP — do weryfikacji' : 'PubChem: zgłoszenia C&L ECHA — do weryfikacji',
      }));
      const ok = await attempt(replaceSubstanceHazards(cas, [...hazards, ...added]), `Dodano klasy: ${added.length}.`);
      if (ok !== undefined) window.location.reload();
    });

  const differing = proposals.filter((p) => !p.same);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Dane z PubChem</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Identyfikatory i klasyfikacja GHS (zał. VI CLP lub zgłoszenia C&amp;L ECHA) wyszukane po numerze CAS. Propozycja do
            weryfikacji — bez SCL, współczynników M i ATE.
          </p>
        </div>
        <button onClick={load} disabled={pending} className="btn-outline">
          {pending ? 'Pobieram…' : data ? 'Pobierz ponownie' : 'Pobierz dane z PubChem'}
        </button>
      </div>

      {data && (
        <div className="mt-4 space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-slate-800">
                Identyfikatory{' '}
                <a href={data.url} target="_blank" rel="noreferrer" className="ml-1 text-xs font-normal text-brand-700 hover:underline">
                  CID {data.cid} ↗
                </a>
              </h3>
              {differing.length > 0 && (
                <button onClick={() => applyIds(differing.map((d) => d.key))} disabled={pending} className="btn-outline px-2 py-1 text-xs">
                  Przyjmij wszystkie różnice ({differing.length})
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {proposals.map((p) => {
                  const { same } = p;
                  return (
                    <tr key={p.key}>
                      <td className="w-40 py-1.5 text-slate-500">{ID_LABEL[p.key]}</td>
                      <td className="py-1.5 font-mono text-xs text-slate-800">{p.proposed}</td>
                      <td className="py-1.5 text-xs text-slate-400">{p.keepOwn && p.current !== p.proposed ? `zostaje: ${p.current}` : same ? '✓ zgodne' : p.current ? `obecnie: ${p.current}` : 'obecnie: brak'}</td>
                      <td className="w-24 py-1.5 text-right">
                        {!same && (
                          <button onClick={() => applyIds([p.key])} disabled={pending} className="btn-ghost px-2 py-0.5 text-xs">
                            Przyjmij
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.iupacName && <p className="mt-1 text-xs text-slate-400">Nazwa IUPAC: {data.iupacName}</p>}
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-slate-800">
              Klasyfikacja{' '}
              {source && (
                <span className={`badge ml-1 ${source.kind === 'harmonised' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {source.kind === 'harmonised' ? 'zharmonizowana — zał. VI CLP' : 'samoklasyfikacje — zgłoszenia C&L ECHA'}
                </span>
              )}
            </h3>
            {!source || rows.length === 0 ? (
              <p className="text-sm text-slate-500">PubChem nie podaje klasyfikacji GHS dla tej substancji.</p>
            ) : (
              <>
                {source.kind === 'notified' && (
                  <p className="mb-2 text-xs text-amber-700">
                    Brak wpisu zharmonizowanego. Poniżej zwroty ze zgłoszeń producentów z odsetkiem zgłaszających — zgłoszenia
                    bywają rozbieżne, wybierz świadomie.
                  </p>
                )}
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.code}>
                        <td className="w-20 py-1.5 font-mono text-xs font-semibold text-slate-800">{r.code}</td>
                        <td className="py-1.5 text-xs text-slate-600">
                          {HAZARD_STATEMENT_BY_CODE.get(r.code)?.textPl ?? '—'}
                          {r.percent != null && <span className="ml-1 text-slate-400">({r.percent} % zgłoszeń)</span>}
                        </td>
                        <td className="w-64 py-1.5">
                          {r.candidates.length === 0 ? (
                            <span className="text-xs text-slate-400">brak klasy w słowniku</span>
                          ) : r.candidates.length === 1 ? (
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={!!r.choice}
                                disabled={existing.has(r.candidates[0])}
                                onChange={(e) => setPicked({ ...picked, [r.code]: e.target.checked ? r.candidates[0] : '' })}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                              />
                              <span className="font-mono">{r.candidates[0]}</span>
                              {existing.has(r.candidates[0]) && <span className="text-slate-400">już jest</span>}
                            </label>
                          ) : (
                            <select
                              className="cell-field"
                              value={r.choice}
                              onChange={(e) => setPicked({ ...picked, [r.code]: e.target.value })}
                            >
                              <option value="">wybierz kategorię…</option>
                              {r.candidates.map((c) => (
                                <option key={c} value={c} disabled={existing.has(c)}>
                                  {c}
                                  {existing.has(c) ? ' (już jest)' : ''}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={addClasses} disabled={pending || toAdd.length === 0} className="btn-primary">
                    Dodaj wybrane klasy ({toAdd.length})
                  </button>
                  <span className="text-xs text-slate-500">
                    Dodane klasy trafią do edytora poniżej — uzupełnij tam SCL, współczynniki M i ATE.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
