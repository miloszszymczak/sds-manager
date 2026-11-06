'use client';

import { useCallback, useState } from 'react';
import { replaceSubstanceHazards, type HazardInput } from '@/server/actions/substances';
import { call } from '@/components/ui/toast';
import { HAZARD_CLASSES, HAZARD_CLASS_BY_CODE } from '@/data/hazard-classes';
import { HAZARD_STATEMENT_BY_CODE } from '@/data/hazard-statements';
import { Picker, type PickerOption } from '@/components/fields/Picker';
import { useAutosave } from '@/components/fields/useAutosave';

/**
 * Edytor strukturalnych danych zagrożeń substancji (F1.1).
 * Dla klas środowiskowych pokazuje pola współczynnika M, dla toksyczności
 * ostrej — pola ATE, dla CMR — pola SCL. To dane wejściowe silnika klasyfikacji.
 */
export function HazardEditor({ cas, initial, readOnly }: { cas: string; initial: HazardInput[]; readOnly?: boolean }) {
  const [picking, setPicking] = useState(false);
  const save = useCallback(
    (next: HazardInput[]) => call(replaceSubstanceHazards(cas, next)),
    [cas],
  );
  const [rows, update, state, flush] = useAutosave<HazardInput[]>(initial, save);

  // Edycja pól tekstowych/liczbowych — zapis z debounce'em (jedna transakcja
  // po zakończeniu pisania, zamiast pełnego delete-all/recreate na każdy znak).
  const patch = (i: number, p: Partial<HazardInput>) =>
    update(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  // Zmiany strukturalne (dodanie/usunięcie klasy) — zapis natychmiastowy.
  const remove = (i: number) => {
    update(rows.filter((_, j) => j !== i));
    flush();
  };
  const addClasses = (codes: string[]) => {
    const existing = new Set(rows.map((r) => r.hazardClass));
    const added = codes
      .filter((c) => !existing.has(c))
      .map<HazardInput>((c) => ({
        hazardClass: c,
        statement: HAZARD_CLASS_BY_CODE.get(c)?.defaultStatement ?? null,
      }));
    update([...rows, ...added]);
    flush();
    setPicking(false);
  };

  const options: PickerOption[] = HAZARD_CLASSES.map((h) => ({
    value: h.code,
    code: h.code,
    label: `${h.namePl} — ${h.categoryPl}`,
    group: h.sortOrder < 200 ? 'Fizyczne' : h.sortOrder < 300 ? 'Zdrowotne' : 'Środowiskowe',
  }));

  return (
    <fieldset disabled={readOnly} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Klasy zagrożenia</h2>
        {state === 'pending' && <span className="text-xs font-medium text-slate-400">Zapisywanie…</span>}
        {state === 'saved' && <span className="text-xs font-medium text-emerald-600">✓ Zapisano</span>}
        {state === 'error' && <span className="text-xs font-medium text-rose-600">Błąd zapisu</span>}
      </div>

      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
          Substancja nie ma jeszcze przypisanych klas zagrożenia.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((r, i) => {
          const meta = HAZARD_CLASS_BY_CODE.get(r.hazardClass);
          const isEnv = (meta?.sortOrder ?? 0) >= 300;
          const isAcuteTox = r.hazardClass.startsWith('Acute Tox.');
          const isCmr = /^(Carc|Muta|Repr)\./.test(r.hazardClass);
          return (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-sm font-semibold text-slate-800">{r.hazardClass}</span>
                  <span className="ml-2 text-sm text-slate-500">{meta?.namePl}</span>
                </div>
                <button onClick={() => remove(i)} className="btn-danger px-2" title="Usuń klasę">
                  ×
                </button>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Zwrot H">
                  <input
                    className="field"
                    value={r.statement ?? ''}
                    placeholder={meta?.defaultStatement ?? 'H___'}
                    onChange={(e) => patch(i, { statement: e.target.value })}
                  />
                </Field>

                {isEnv && (
                  <>
                    <Num label="Współczynnik M (ostre)" value={r.mFactorAcute} onChange={(v) => patch(i, { mFactorAcute: v })} />
                    <Num
                      label="Współczynnik M (przewlekłe)"
                      value={r.mFactorChronic}
                      onChange={(v) => patch(i, { mFactorChronic: v })}
                    />
                  </>
                )}

                {isAcuteTox && (
                  <>
                    <Num label="ATE doustnie [mg/kg]" value={r.ateOral} onChange={(v) => patch(i, { ateOral: v })} />
                    <Num label="ATE skórnie [mg/kg]" value={r.ateDermal} onChange={(v) => patch(i, { ateDermal: v })} />
                    <Num label="ATE inhal. pyły [mg/l]" value={r.ateInhalDust} onChange={(v) => patch(i, { ateInhalDust: v })} />
                  </>
                )}

                {isCmr && (
                  <>
                    <Num label="SCL — granica dolna [%]" value={r.sclMin} onChange={(v) => patch(i, { sclMin: v })} />
                    <Field label="SCL — zwrot H">
                      <input
                        className="field"
                        value={r.sclStatement ?? ''}
                        placeholder="H360FD"
                        onChange={(e) => patch(i, { sclStatement: e.target.value })}
                      />
                    </Field>
                  </>
                )}
              </div>
              {r.statement && HAZARD_STATEMENT_BY_CODE.get(r.statement) && (
                <p className="mt-1.5 text-xs text-slate-400">{HAZARD_STATEMENT_BY_CODE.get(r.statement)!.textPl}</p>
              )}
            </div>
          );
        })}
      </div>

      {picking ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <Picker options={options} selected={[]} onChange={addClasses} placeholder="Wybierz klasy zagrożenia do dodania…" />
        </div>
      ) : (
        <button onClick={() => setPicking(true)} className="btn-outline">
          + Dodaj klasę zagrożenia
        </button>
      )}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        step="any"
        className="field"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </Field>
  );
}
