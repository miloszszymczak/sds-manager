'use client';

import type { FieldDef } from '@/lib/schema/sections';
import { useAutosave } from './useAutosave';
import { FieldFrame } from './BasicFields';
import { Picker, type PickerOption } from './Picker';
import { HAZARD_STATEMENTS } from '@/data/hazard-statements';
import { PRECAUTIONARY_STATEMENTS } from '@/data/precautionary-statements';
import { PICTOGRAMS, PICTOGRAM_BY_CODE } from '@/data/pictograms';
import { HAZARD_CLASSES, pictogramsForClasses, statementsForClasses } from '@/data/hazard-classes';

type Save = (value: unknown) => Promise<void>;

const GROUP_LABEL: Record<string, string> = {
  FIZYCZNE: 'Zagrożenia fizyczne',
  ZDROWOTNE: 'Zagrożenia dla zdrowia',
  SRODOWISKOWE: 'Zagrożenia dla środowiska',
  UZUPELNIAJACE: 'Zwroty uzupełniające (EUH)',
  OGOLNE: 'Ogólne',
  ZAPOBIEGANIE: 'Zapobieganie',
  REAGOWANIE: 'Reagowanie',
  PRZECHOWYWANIE: 'Przechowywanie',
  USUWANIE: 'Usuwanie',
};

/* ─────────────── ZWROTY H ─────────────── */

export function HazardStatementsField({
  field,
  value,
  save,
  suggestions = [],
}: {
  field: FieldDef;
  value: string[];
  save: Save;
  suggestions?: string[];
}) {
  const [v, set, state] = useAutosave<string[]>(Array.isArray(value) ? value : [], (x) => save(x));

  const options: PickerOption[] = HAZARD_STATEMENTS.map((h) => ({
    value: h.code,
    code: h.code,
    label: h.textPl,
    group: GROUP_LABEL[h.category],
  }));

  const missing = suggestions.filter((s) => !v.includes(s));

  return (
    <FieldFrame field={field} state={state}>
      {missing.length > 0 && (
        <SuggestionBar
          label="Z klasyfikacji wynikają dodatkowe zwroty:"
          items={missing}
          onApply={() => set([...v, ...missing].sort())}
        />
      )}
      <Picker options={options} selected={v} onChange={set} placeholder="Dodaj zwrot H / EUH…" />
    </FieldFrame>
  );
}

/* ─────────────── ZWROTY P ─────────────── */

export function PrecautionaryStatementsField({ field, value, save }: { field: FieldDef; value: string[]; save: Save }) {
  const [v, set, state] = useAutosave<string[]>(Array.isArray(value) ? value : [], (x) => save(x));
  const options: PickerOption[] = PRECAUTIONARY_STATEMENTS.map((p) => ({
    value: p.code,
    code: p.code,
    label: p.textPl,
    group: GROUP_LABEL[p.type],
  }));
  return (
    <FieldFrame field={field} state={state}>
      <Picker options={options} selected={v} onChange={set} placeholder="Dodaj zwrot P…" />
    </FieldFrame>
  );
}

/* ─────────────── KLASY ZAGROŻENIA ─────────────── */

export function HazardClassesField({ field, value, save }: { field: FieldDef; value: string[]; save: Save }) {
  const [v, set, state] = useAutosave<string[]>(Array.isArray(value) ? value : [], (x) => save(x));
  const options: PickerOption[] = HAZARD_CLASSES.map((h) => ({
    value: h.code,
    code: h.code,
    label: `${h.namePl} — ${h.categoryPl}`,
    hint: h.defaultStatement ? `→ ${h.defaultStatement}` : undefined,
    group:
      h.sortOrder < 200 ? 'Zagrożenia fizyczne' : h.sortOrder < 300 ? 'Zagrożenia dla zdrowia' : 'Zagrożenia dla środowiska',
  }));

  return (
    <FieldFrame field={field} state={state}>
      <Picker options={options} selected={v} onChange={set} placeholder="Dodaj klasę zagrożenia…" />
      {v.length > 0 && (
        <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-xs">
          <p className="mb-2 font-semibold text-brand-900">Konsekwencje wybranej klasyfikacji</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Piktogramy:</span>
              {pictogramsForClasses(v).map((p) => (
                <span key={p} className="inline-block h-7 w-7" dangerouslySetInnerHTML={{ __html: PICTOGRAM_BY_CODE.get(p)?.svg ?? '' }} />
              ))}
              {pictogramsForClasses(v).length === 0 && <span className="text-slate-400">brak</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Zwroty H:</span>
              <span className="font-medium text-slate-700">{statementsForClasses(v).join(', ') || 'brak'}</span>
            </div>
          </div>
        </div>
      )}
    </FieldFrame>
  );
}

/* ─────────────── PIKTOGRAMY ─────────────── */

export function PictogramsField({
  field,
  value,
  save,
  suggestions = [],
}: {
  field: FieldDef;
  value: string[];
  save: Save;
  suggestions?: string[];
}) {
  const [v, set, state] = useAutosave<string[]>(Array.isArray(value) ? value : [], (x) => save(x));
  const missing = suggestions.filter((s) => !v.includes(s));

  return (
    <FieldFrame field={field} state={state}>
      {missing.length > 0 && (
        <SuggestionBar
          label="Klasyfikacja wymaga dodatkowych piktogramów:"
          items={missing}
          onApply={() => set([...v, ...missing].sort())}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {PICTOGRAMS.map((p) => {
          const on = v.includes(p.code);
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => set(on ? v.filter((x) => x !== p.code) : [...v, p.code].sort())}
              title={`${p.code} — ${p.descriptionPl}`}
              className={`flex w-[104px] flex-col items-center gap-1 rounded-lg border-2 p-2 transition ${
                on ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white opacity-45 hover:opacity-90'
              }`}
            >
              <span className="h-14 w-14" dangerouslySetInnerHTML={{ __html: p.svg }} />
              <span className="text-[11px] font-semibold text-slate-700">{p.code}</span>
              <span className="text-center text-[10px] leading-tight text-slate-500">{p.namePl}</span>
            </button>
          );
        })}
      </div>
    </FieldFrame>
  );
}

/* ─────────────── KODY ODPADÓW ─────────────── */

export function WasteCodesField({
  field,
  value,
  save,
  catalog,
}: {
  field: FieldDef;
  value: string[];
  save: Save;
  catalog: { code: string; descriptionPl: string; isHazardous: boolean }[];
}) {
  const [v, set, state] = useAutosave<string[]>(Array.isArray(value) ? value : [], (x) => save(x));
  const options: PickerOption[] = catalog.map((w) => ({
    value: w.code,
    code: w.code,
    label: w.descriptionPl,
    group: w.isHazardous ? 'Odpady niebezpieczne (*)' : 'Odpady inne niż niebezpieczne',
  }));
  return (
    <FieldFrame field={field} state={state}>
      <Picker options={options} selected={v} onChange={set} placeholder="Dodaj kod odpadu…" />
    </FieldFrame>
  );
}

/* ─────────────── PODSTAWY PRAWNE ─────────────── */

export function LegalRefsField({
  field,
  value,
  save,
  catalog,
}: {
  field: FieldDef;
  value: string[];
  save: Save;
  catalog: { id: string; title: string; journalRef: string | null; category: string }[];
}) {
  const [v, set, state] = useAutosave<string[]>(Array.isArray(value) ? value : [], (x) => save(x));
  const groups: Record<string, string> = { UE: 'Przepisy UE', KRAJOWE: 'Przepisy krajowe', TRANSPORT: 'Transport' };
  const options: PickerOption[] = catalog.map((l) => ({
    value: l.id,
    label: l.title,
    hint: l.journalRef ?? undefined,
    group: groups[l.category] ?? l.category,
  }));
  return (
    <FieldFrame field={field} state={state}>
      <Picker options={options} selected={v} onChange={set} placeholder="Dodaj podstawę prawną…" />
    </FieldFrame>
  );
}

/* ─────────────── PASEK SUGESTII ─────────────── */

function SuggestionBar({ label, items, onApply }: { label: string; items: string[]; onApply: () => void }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <span className="text-xs text-amber-900">
        {label} <strong>{items.join(', ')}</strong>
      </span>
      <button onClick={onApply} className="btn bg-amber-500 px-2 py-1 text-xs text-white hover:bg-amber-600">
        Zastosuj
      </button>
    </div>
  );
}
