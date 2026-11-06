'use client';

import { useMemo } from 'react';
import { validateDocument, summarize, type ValidationInput, type Issue } from '@/lib/validation/rules';
import { parsePercent } from '@/lib/percent';
import { SECTION_BY_NUMBER } from '@/lib/schema/sections';
import type { ComponentRow } from '@/components/fields/ComponentsField';

/** Buduje wejście walidatora z żywego stanu edytora. */
export function buildValidationInput(
  sections: Record<number, Record<string, unknown>>,
  components: ComponentRow[],
  ufi: string | null,
  version: string,
): ValidationInput {
  return {
    ufi,
    version,
    issueDate: true,
    sections,
    components: components.map((c) => ({
      name: c.name,
      percent: parsePercent(c.concentration),
      isSvhc: c.isSvhc,
      hazardStatements: c.hazardStatements,
    })),
  };
}

const SEV_STYLE: Record<Issue['severity'], string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-slate-200 bg-slate-50 text-slate-600',
};
const SEV_ICON: Record<Issue['severity'], string> = { error: '✕', warning: '!', info: 'i' };
const SEV_LABEL: Record<Issue['severity'], string> = { error: 'Błąd', warning: 'Ostrzeżenie', info: 'Informacja' };

export function ValidationPanel({
  input,
  onJump,
  onClose,
}: {
  input: ValidationInput;
  onJump: (section: number) => void;
  onClose: () => void;
}) {
  const issues = useMemo(() => validateDocument(input), [input]);
  const sum = summarize(issues);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-800">Spójność karty</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {sum.errors} {sum.errors === 1 ? 'błąd' : 'błędów'} · {sum.warnings} ostrzeżeń · {sum.infos} informacji
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost px-2" title="Zamknij">
          ×
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
          ✓ Nie znaleziono uchybień. Karta jest spójna.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {issues.map((iss, i) => (
            <li key={i}>
              <button
                onClick={() => onJump(iss.section)}
                className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition hover:brightness-95 ${SEV_STYLE[iss.severity]}`}
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">
                  {SEV_ICON[iss.severity]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{iss.message}</span>
                  <span className="mt-0.5 block text-xs opacity-70">
                    {SEV_LABEL[iss.severity]} · sekcja {iss.section} —{' '}
                    {SECTION_BY_NUMBER.get(iss.section)?.shortTitle}
                  </span>
                </span>
                <span className="shrink-0 text-xs opacity-60">przejdź →</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
