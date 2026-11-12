'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { applyAnnexVi, previewAnnexVi, type AnnexViPreview as Preview, type AnnexViProposal } from '@/server/actions/annex-vi';
import { attempt } from '@/components/ui/toast';

export function AnnexViImport() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<number | null>(null);

  const upload = (form: FormData) =>
    startTransition(async () => {
      setDone(null);
      const r = await attempt(previewAnnexVi(form));
      if (!r) return;
      setPreview(r);
      setSelected(new Set(r.proposals.map((p) => p.cas)));
    });

  const apply = () =>
    startTransition(async () => {
      const items = preview!.proposals
        .filter((p) => selected.has(p.cas))
        .map((p) => ({ cas: p.cas, indexNumber: p.indexNumber, ecNumber: p.ecNumber, hazards: p.hazards }));
      const n = await attempt(applyAnnexVi(items), 'Zaimportowano dane zał. VI.');
      if (n === undefined) return;
      setDone(n);
      setPreview(null);
    });

  const toggle = (cas: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(cas)) next.delete(cas);
      else next.add(cas);
      return next;
    });

  return (
    <div className="space-y-6">
      <ol className="list-decimal space-y-1 rounded-xl border border-slate-200 bg-white p-5 pl-10 text-sm text-slate-700 shadow-sm">
        <li>
          Pobierz aktualną tabelę ze strony{' '}
          <a
            href="https://echa.europa.eu/information-on-chemicals/annex-vi-to-clp"
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 hover:underline"
          >
            ECHA — Table of harmonised entries in Annex VI to CLP ↗
          </a>{' '}
          (plik Excel z wpisami zharmonizowanymi, w tym najnowsze ATP).
        </li>
        <li>Wgraj plik poniżej — aplikacja dopasuje wpisy do substancji po numerze CAS i pokaże różnice.</li>
        <li>Zaznacz substancje do aktualizacji. Import niczego nie usuwa: uzupełnia klasy, SCL, współczynniki M i ATE.</li>
      </ol>

      <form action={upload} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <input type="file" name="file" accept=".xlsx" required className="text-sm" />
        <button disabled={pending} className="btn-primary">
          {pending && !preview ? 'Analizuję…' : 'Porównaj z biblioteką'}
        </button>
      </form>

      {done !== null && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Zaktualizowano substancje: {done}. Klasyfikację kart przelicz w edytorze (sekcja 2 → „Przelicz z składników”).
        </p>
      )}

      {preview && (
        <section className="space-y-4">
          <p className="text-sm text-slate-600">
            Wpisów w tabeli: <strong>{preview.entries}</strong> · dopasowane substancje: <strong>{preview.matched}</strong> · bez
            zmian: <strong>{preview.unchanged}</strong> · bez wpisu zharmonizowanego: <strong>{preview.withoutEntry.length}</strong>
          </p>
          {preview.proposals.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              Biblioteka jest zgodna z tabelą — nic do zaktualizowania.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="w-10 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selected.size === preview.proposals.length}
                        onChange={(e) => setSelected(new Set(e.target.checked ? preview.proposals.map((p) => p.cas) : []))}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                    </th>
                    <th className="px-4 py-2">Substancja</th>
                    <th className="px-4 py-2">Wpis zał. VI</th>
                    <th className="px-4 py-2">Zmiany</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  {preview.proposals.map((p: AnnexViProposal) => (
                    <tr key={p.cas}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(p.cas)}
                          onChange={() => toggle(p.cas)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/substancje/${encodeURIComponent(p.cas)}`} className="font-medium text-slate-800 hover:text-brand-700">
                          {p.substanceName}
                        </Link>
                        <div className="font-mono text-xs text-slate-400">{p.cas}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div className="font-mono">{p.indexNumber}</div>
                        <div className="text-slate-400">{p.entryName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-0.5 text-xs text-slate-700">
                          {[...p.identifierChanges, ...p.changes].map((c) => (
                            <li key={c}>• {c}</li>
                          ))}
                          {p.unknownClasses.length > 0 && (
                            <li className="text-amber-700">pominięte (brak w słowniku): {p.unknownClasses.join(', ')}</li>
                          )}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-3 border-t border-slate-100 p-3">
                <button onClick={apply} disabled={pending || selected.size === 0} className="btn-primary">
                  Zapisz zaznaczone ({selected.size})
                </button>
                <span className="text-xs text-slate-500">Arkusz ECHA jest nieoficjalny — wiążąca jest tabela 3 zał. VI w Dz.U. UE.</span>
              </div>
            </div>
          )}
          {preview.withoutEntry.length > 0 && (
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer">Substancje bez wpisu zharmonizowanego ({preview.withoutEntry.length})</summary>
              <p className="mt-1">{preview.withoutEntry.join(', ')} — klasyfikację ustala dostawca (np. dane z PubChem/C&amp;L).</p>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
