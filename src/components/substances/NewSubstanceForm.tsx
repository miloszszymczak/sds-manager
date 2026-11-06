'use client';

import { useActionState } from 'react';
import { createSubstance } from '@/server/actions/substances';
import type { ActionResult } from '@/lib/action-result';

export function NewSubstanceForm() {
  const [state, action, pending] = useActionState<ActionResult<string> | null, FormData>(createSubstance, null);
  return (
    <details className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm" open={state?.ok === false}>
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 select-none">+ Dodaj substancję</summary>
      <form action={action} className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field name="cas" label="Numer CAS *" placeholder="123-31-9" required mono />
        <div className="sm:col-span-2">
          <Field name="name" label="Nazwa (polska) *" placeholder="np. Hydrochinon" required />
        </div>
        <Field name="nameEn" label="Nazwa angielska" placeholder="Hydroquinone" />
        <Field name="ecNumber" label="Numer WE" placeholder="204-617-8" mono />
        <Field name="molecularFormula" label="Wzór chemiczny" placeholder="C6H4(OH)2" />
        <label className="flex items-center gap-2 self-end pb-2">
          <input type="checkbox" name="isSvhc" className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          <span className="text-sm text-slate-700">SVHC</span>
        </label>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button disabled={pending} className="btn-primary">
            {pending ? 'Zapisuję…' : 'Dodaj substancję'}
          </button>
          {state?.ok === false && <span className="text-sm text-red-700">{state.error}</span>}
          <span className="text-xs text-slate-500">Klasy zagrożenia, ATE, SCL i współczynniki M uzupełnisz na stronie substancji.</span>
        </div>
      </form>
    </details>
  );
}

function Field(props: { name: string; label: string; placeholder?: string; required?: boolean; mono?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{props.label}</label>
      <input name={props.name} required={props.required} placeholder={props.placeholder} className={`field ${props.mono ? 'font-mono' : ''}`} />
    </div>
  );
}
