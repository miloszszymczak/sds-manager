'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateSubstance } from '@/server/actions/substances';
import { attempt } from '@/components/ui/toast';

export interface SubstanceMetaValues {
  cas: string;
  name: string;
  nameEn: string | null;
  ecNumber: string | null;
  indexNumber: string | null;
  reachNumber: string | null;
  molecularFormula: string | null;
  molarMass: string | null;
  density: number | null;
  sclNotes: string | null;
  notes: string | null;
  isSvhc: boolean;
}

type TextKey = Exclude<keyof SubstanceMetaValues, 'isSvhc' | 'density'>;

/** Identyfikatory substancji — zapis przy opuszczeniu pola. Zmiana CAS przenosi na nowy adres. */
export function SubstanceMeta({ initial, readOnly }: { initial: SubstanceMetaValues; readOnly?: boolean }) {
  const router = useRouter();
  const [m, setM] = useState(initial);
  const [, startTransition] = useTransition();
  // Porównujemy z ostatnio zapisanym stanem, nie z `initial` — cofnięcie zmiany też się zapisze.
  const saved = useRef(initial);

  const push = (patch: Partial<SubstanceMetaValues>) =>
    startTransition(async () => {
      const cas = await attempt(updateSubstance(saved.current.cas, patch), 'Zapisano.');
      if (cas === undefined) {
        setM((cur) => ({ ...cur, ...pick(saved.current, patch) })); // odrzucono — przywróć
        return;
      }
      saved.current = { ...saved.current, ...patch };
      if (patch.cas && cas !== initial.cas) router.replace(`/substancje/${encodeURIComponent(cas)}`);
    });

  const text = (label: string, key: TextKey, placeholder?: string, mono = false) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        className={`field ${mono ? 'font-mono' : ''}`}
        placeholder={placeholder}
        value={m[key] ?? ''}
        onChange={(e) => setM({ ...m, [key]: e.target.value })}
        onBlur={(e) => e.target.value !== (saved.current[key] ?? '') && push({ [key]: e.target.value })}
      />
    </div>
  );

  return (
    <fieldset disabled={readOnly} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Identyfikatory</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">{text('Nazwa (polska)', 'name')}</div>
        <div className="sm:col-span-2">{text('Nazwa angielska', 'nameEn')}</div>
        {text('Numer CAS (identyfikator)', 'cas', '123-31-9', true)}
        {text('Numer WE', 'ecNumber', '204-617-8', true)}
        {text('Numer indeksowy', 'indexNumber', '604-005-00-4', true)}
        {text('Numer REACH', 'reachNumber', '01-…', true)}
        {text('Wzór chemiczny', 'molecularFormula', 'C6H4(OH)2')}
        {text('Masa molowa', 'molarMass', '110,11 g/mol')}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Gęstość [g/ml]</label>
          <input
            type="number"
            step="any"
            min="0"
            className="field"
            placeholder="dla składników w ml"
            value={m.density ?? ''}
            onChange={(e) => setM({ ...m, density: e.target.value === '' ? null : Number(e.target.value) })}
            onBlur={() => m.density !== saved.current.density && push({ density: m.density })}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2">
          <input
            type="checkbox"
            checked={m.isSvhc}
            onChange={(e) => {
              setM({ ...m, isSvhc: e.target.checked });
              push({ isSvhc: e.target.checked });
            }}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          <span className="text-sm text-slate-700">Lista kandydacka SVHC</span>
        </label>
        <div className="sm:col-span-2">{text('Specyficzne stężenia graniczne / współczynnik M (opis)', 'sclNotes')}</div>
        <div className="sm:col-span-2">{text('Uwagi', 'notes')}</div>
      </div>
    </fieldset>
  );
}

function pick<T extends object>(src: T, keys: Partial<T>): Partial<T> {
  return Object.fromEntries(Object.keys(keys).map((k) => [k, src[k as keyof T]])) as Partial<T>;
}
