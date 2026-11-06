'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { updateDocumentMeta } from '@/server/actions/documents';
import { attempt } from '@/components/ui/toast';

const STATUSES = [
  { value: 'SZKIC', label: 'Szkic' },
  { value: 'DO_PRZEGLADU', label: 'Do przeglądu' },
  { value: 'ZATWIERDZONA', label: 'Zatwierdzona' },
] as const;

type Status = (typeof STATUSES)[number]['value'];

export interface DocumentContext {
  mixtureId: string;
  mixtureName: string;
  variant: string | null;
  packet: string | null;
}

export function DocumentHeader({
  documentId,
  productName,
  version,
  status,
  ufi,
  context,
  editable,
  onWriteError,
}: {
  documentId: string;
  productName: string;
  version: string;
  status: Status;
  ufi: string | null;
  context: DocumentContext | null;
  editable: boolean;
  onWriteError: () => void;
}) {
  const [saved, setSaved] = useState({ productName, version, status, ufi: ufi ?? '' });
  const [draft, setDraft] = useState(saved);
  const [, startTransition] = useTransition();

  const push = (patch: Partial<typeof saved>) =>
    startTransition(async () => {
      const ok = await attempt(updateDocumentMeta(documentId, patch), 'Zapisano.');
      if (ok === undefined) {
        setDraft((d) => ({ ...d, ...Object.fromEntries(Object.keys(patch).map((k) => [k, saved[k as keyof typeof saved]])) }));
        onWriteError();
        return;
      }
      setSaved((s) => ({ ...s, ...patch }));
    });

  return (
    <div className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1600px] px-5 pt-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Link href="/dokumenty" className="hover:text-slate-600">
            Karty SDS
          </Link>
          {context && (
            <>
              <span>/</span>
              <Link href={`/mieszaniny/${context.mixtureId}`} className="hover:text-slate-600">
                {context.mixtureName}
              </Link>
              {context.variant && <span className="badge bg-slate-100 text-slate-600">{context.variant}</span>}
              {context.packet && <span className="badge bg-brand-50 text-brand-700">{context.packet}</span>}
            </>
          )}
        </div>
      </div>
      <fieldset disabled={!editable} className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-5 py-2">
        <input
          value={draft.productName}
          onChange={(e) => setDraft({ ...draft, productName: e.target.value })}
          onBlur={() => draft.productName !== saved.productName && push({ productName: draft.productName })}
          className="min-w-64 flex-1 rounded-md border border-transparent px-2 py-1.5 text-lg font-semibold tracking-tight outline-none hover:border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          UFI
          <input
            value={draft.ufi}
            onChange={(e) => setDraft({ ...draft, ufi: e.target.value })}
            onBlur={() => draft.ufi !== saved.ufi && push({ ufi: draft.ufi })}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="w-48 rounded-md border border-slate-300 px-2 py-1 font-mono text-sm outline-none focus:border-brand-500"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Wersja
          <input
            value={draft.version}
            onChange={(e) => setDraft({ ...draft, version: e.target.value })}
            onBlur={() => draft.version !== saved.version && push({ version: draft.version })}
            className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <select
          value={draft.status}
          onChange={(e) => {
            const status = e.target.value as Status;
            setDraft({ ...draft, status });
            push({ status });
          }}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </fieldset>
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-5 pb-3">
        <Link href={`/dokumenty/${documentId}/historia`} className="btn-ghost">
          Historia
        </Link>
        <Link href={`/dokumenty/${documentId}/pcn`} className="btn-ghost">
          PCN
        </Link>
        <Link href={`/dokumenty/${documentId}/etykieta`} className="btn-outline">
          Etykieta
        </Link>
        <Link href={`/dokumenty/${documentId}/podglad`} className="btn-primary">
          Podgląd / PDF
        </Link>
      </div>
    </div>
  );
}
