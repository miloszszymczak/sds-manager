'use client';

import { useState, useTransition } from 'react';
import { createSectionTemplate } from '@/server/actions/templates';
import { attempt } from '@/components/ui/toast';

export interface SectionTemplate {
  id: string;
  name: string;
  section: number;
  data: Record<string, unknown>;
}

/**
 * Kontrolki szablonów sekcji (C1) w nagłówku sekcji: zapis bieżącej treści
 * jako szablon oraz wstawienie treści z zapisanego szablonu.
 */
export function SectionTemplateControls({
  section,
  currentData,
  templates,
  onApply,
}: {
  section: number;
  currentData: Record<string, unknown>;
  templates: SectionTemplate[];
  onApply: (data: Record<string, unknown>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [, startTransition] = useTransition();
  const mine = templates.filter((t) => t.section === section);

  return (
    <div className="flex items-center gap-1.5">
      {mine.length > 0 && (
        <select
          defaultValue=""
          onChange={(e) => {
            const t = mine.find((x) => x.id === e.target.value);
            if (t) onApply(t.data);
            e.currentTarget.value = '';
          }}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 outline-none focus:border-brand-500"
          title="Wstaw z szablonu"
        >
          <option value="">Wstaw z szablonu…</option>
          {mine.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      {saving ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => void (await attempt(createSectionTemplate(name || `Szablon sekcji ${section}`, section, currentData), 'Zapisano szablon.')));
            setSaving(false);
            setName('');
          }}
          className="flex items-center gap-1"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nazwa szablonu"
            className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-500"
          />
          <button type="submit" className="btn-primary px-2 py-1 text-xs">
            Zapisz
          </button>
          <button type="button" onClick={() => setSaving(false)} className="btn-ghost px-1.5 text-xs">
            ×
          </button>
        </form>
      ) : (
        <button onClick={() => setSaving(true)} className="btn-ghost text-xs text-slate-500" title="Zapisz treść sekcji jako szablon">
          Zapisz jako szablon
        </button>
      )}
    </div>
  );
}
