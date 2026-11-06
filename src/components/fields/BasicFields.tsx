'use client';

import type { FieldDef, TableColumn, KeyValueRow } from '@/lib/schema/sections';
import { useAutosave } from './useAutosave';
import { SaveIndicator } from './SaveIndicator';

type Save = (value: unknown) => Promise<void>;

/* ─────────────── TEKST / OBSZAR TEKSTOWY ─────────────── */

export function TextField({ field, value, save }: { field: FieldDef; value: string; save: Save }) {
  const [v, set, state] = useAutosave(value ?? '', (x) => save(x));
  const Tag = field.type === 'textarea' ? 'textarea' : 'input';
  return (
    <FieldFrame field={field} state={state}>
      <Tag
        className="field"
        value={v}
        placeholder={field.placeholder}
        rows={field.type === 'textarea' ? 4 : undefined}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(e.target.value)}
      />
    </FieldFrame>
  );
}

/* ─────────────── LISTA PUNKTOWANA ─────────────── */

export function ListField({ field, value, save }: { field: FieldDef; value: string[]; save: Save }) {
  const [items, set, state] = useAutosave<string[]>(Array.isArray(value) ? value : [], (x) => save(x));

  const update = (i: number, text: string) => set(items.map((v, j) => (j === i ? text : v)));
  const remove = (i: number) => set(items.filter((_, j) => j !== i));
  const add = () => set([...items, '']);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  return (
    <FieldFrame field={field} state={state}>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="group flex items-start gap-1.5">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <textarea
              className="field min-h-[38px] flex-1"
              rows={1}
              value={item}
              onChange={(e) => update(i, e.target.value)}
            />
            <div className="flex shrink-0 opacity-0 transition group-hover:opacity-100">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="btn-ghost px-1.5" title="W górę">
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="btn-ghost px-1.5"
                title="W dół"
              >
                ↓
              </button>
              <button onClick={() => remove(i)} className="btn-danger px-1.5" title="Usuń">
                ×
              </button>
            </div>
          </div>
        ))}
        <button onClick={add} className="btn-outline mt-1">
          + Dodaj pozycję
        </button>
      </div>
    </FieldFrame>
  );
}

/* ─────────────── TABELA EDYTOWALNA ─────────────── */

type Row = Record<string, string>;

export function TableField({ field, value, save }: { field: FieldDef; value: Row[]; save: Save }) {
  const cols: TableColumn[] = field.columns ?? [];
  const [rows, set, state] = useAutosave<Row[]>(Array.isArray(value) ? value : [], (x) => save(x));

  const update = (i: number, key: string, text: string) =>
    set(rows.map((r, j) => (j === i ? { ...r, [key]: text } : r)));
  const addRow = () => set([...rows, Object.fromEntries(cols.map((c) => [c.key, '']))]);
  const removeRow = (i: number) => set(rows.filter((_, j) => j !== i));
  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  return (
    <FieldFrame field={field} state={state}>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left">
              {cols.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width ? `${c.width}%` : undefined }}
                  className="border-b border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600"
                >
                  {c.label}
                </th>
              ))}
              <th className="w-24 border-b border-slate-200 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className="group hover:bg-slate-50/60">
                {cols.map((c) => (
                  <td key={c.key} className="border-r border-slate-100 last:border-r-0">
                    {c.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        className="cell-input resize-y"
                        value={row[c.key] ?? ''}
                        onChange={(e) => update(i, c.key, e.target.value)}
                      />
                    ) : (
                      <input
                        className="cell-input"
                        value={row[c.key] ?? ''}
                        onChange={(e) => update(i, c.key, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td className="px-1">
                  <div className="flex justify-end opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => moveRow(i, -1)} disabled={i === 0} className="btn-ghost px-1.5">
                      ↑
                    </button>
                    <button
                      onClick={() => moveRow(i, 1)}
                      disabled={i === rows.length - 1}
                      className="btn-ghost px-1.5"
                    >
                      ↓
                    </button>
                    <button onClick={() => removeRow(i)} className="btn-danger px-1.5">
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="px-3 py-6 text-center text-sm text-slate-400">
                  Tabela jest pusta
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="btn-outline mt-2">
        + Dodaj wiersz
      </button>
    </FieldFrame>
  );
}

/* ─────────────── PARY KLUCZ–WARTOŚĆ ─────────────── */

export function KeyValueField({
  field,
  value,
  save,
}: {
  field: FieldDef;
  value: Record<string, string>;
  save: Save;
}) {
  const rows: KeyValueRow[] = field.rows ?? [];
  const [data, set, state] = useAutosave<Record<string, string>>(value ?? {}, (x) => save(x));

  return (
    <FieldFrame field={field} state={state}>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse">
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50/60">
                <td className="w-[38%] border-r border-slate-100 bg-slate-50/50 px-3 py-2 align-top">
                  <span className="text-sm text-slate-700">
                    {r.marker && <span className="mr-1 text-slate-400">{r.marker}</span>}
                    {r.label}
                  </span>
                </td>
                <td className="align-top">
                  <textarea
                    rows={1}
                    placeholder={r.placeholder}
                    className="cell-input min-h-[38px] resize-y py-2"
                    value={data[r.key] ?? ''}
                    onChange={(e) => set({ ...data, [r.key]: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FieldFrame>
  );
}

/* ─────────────── HASŁO OSTRZEGAWCZE ─────────────── */

export function SignalWordField({
  field,
  value,
  save,
  suggestion,
}: {
  field: FieldDef;
  value: string;
  save: Save;
  suggestion?: string | null;
}) {
  const [v, set, state] = useAutosave(value ?? '', (x) => save(x));
  const options = ['', 'NIEBEZPIECZEŃSTWO', 'UWAGA'];

  return (
    <FieldFrame field={field} state={state}>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => (
          <button
            key={o || 'brak'}
            onClick={() => set(o)}
            className={`btn ${
              v === o
                ? o === 'NIEBEZPIECZEŃSTWO'
                  ? 'bg-red-600 text-white'
                  : o === 'UWAGA'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-600 text-white'
                : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {o || 'brak'}
          </button>
        ))}
        {suggestion && suggestion !== v && (
          <button onClick={() => set(suggestion)} className="btn-ghost text-xs text-brand-700">
            ⚡ Sugestia z klasyfikacji: <strong className="ml-1">{suggestion}</strong>
          </button>
        )}
      </div>
    </FieldFrame>
  );
}

/* ─────────────── PRZEŁĄCZNIK ─────────────── */

export function BooleanField({ field, value, save }: { field: FieldDef; value: boolean; save: Save }) {
  const [v, set, state] = useAutosave(Boolean(value), (x) => save(x));
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3">
      <div>
        <label className="text-sm font-medium text-slate-700">{field.label}</label>
        {field.help && <p className="mt-0.5 text-xs text-slate-500">{field.help}</p>}
      </div>
      <div className="flex items-center gap-2">
        <SaveIndicator state={state} />
        <button
          onClick={() => set(!v)}
          role="switch"
          aria-checked={v}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${v ? 'bg-brand-600' : 'bg-slate-300'}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              v ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

/* ─────────────── TRANSPORT (sekcja 14) ─────────────── */

import { TRANSPORT_MODES, TRANSPORT_PARAMS } from '@/data/reference-data';

interface TransportValue {
  niePodlega: boolean;
  mody: Record<string, Record<string, string>>;
}

export function TransportField({ field, value, save }: { field: FieldDef; value: TransportValue; save: Save }) {
  const init: TransportValue = value?.mody ? value : { niePodlega: true, mody: {} };
  const [v, set, state] = useAutosave<TransportValue>(init, (x) => save(x));

  const setCell = (mode: string, param: string, text: string) =>
    set({ ...v, mody: { ...v.mody, [mode]: { ...(v.mody[mode] ?? {}), [param]: text } } });

  return (
    <FieldFrame field={field} state={state}>
      <label className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <input
          type="checkbox"
          checked={v.niePodlega}
          onChange={(e) => set({ ...v, niePodlega: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
        />
        <span className="text-sm text-slate-700">
          Produkt <strong>nie jest</strong> towarem niebezpiecznym w rozumieniu przepisów transportowych
        </span>
      </label>

      {!v.niePodlega && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">
                  Parametr
                </th>
                {TRANSPORT_MODES.map((m) => (
                  <th
                    key={m.key}
                    className="border-b border-l border-slate-200 px-2 py-2 text-left text-xs font-semibold text-slate-600"
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TRANSPORT_PARAMS.map((p) => (
                <tr key={p.key} className="hover:bg-slate-50/60">
                  <td className="bg-slate-50/50 px-3 py-2 text-sm text-slate-700">{p.label}</td>
                  {TRANSPORT_MODES.map((m) => (
                    <td key={m.key} className="border-l border-slate-100">
                      <input
                        className="cell-input"
                        value={v.mody[m.key]?.[p.key] ?? ''}
                        onChange={(e) => setCell(m.key, p.key, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FieldFrame>
  );
}

/* ─────────────── RAMKA POLA ─────────────── */

export function FieldFrame({
  field,
  state,
  children,
}: {
  field: FieldDef;
  state: ReturnType<typeof useAutosave>[2];
  children: React.ReactNode;
}) {
  return (
    <div>
      {!field.hideLabel && field.label && (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-slate-700">{field.label}</label>
          <SaveIndicator state={state} />
        </div>
      )}
      {field.hideLabel && (
        <div className="mb-1.5 flex justify-end">
          <SaveIndicator state={state} />
        </div>
      )}
      {field.help && <p className="mb-2 text-xs text-slate-500">{field.help}</p>}
      {children}
    </div>
  );
}
