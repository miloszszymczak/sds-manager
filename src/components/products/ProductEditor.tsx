'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { addProductItem, deleteProduct, removeProductItem, updateProduct, updateProductItem } from '@/server/actions/products';
import { attempt } from '@/components/ui/toast';
import { formatMass, formatVolume } from '@/lib/mixture';
import type { ActionResult } from '@/lib/action-result';

export interface ProductData {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  items: {
    id: string;
    variantId: string;
    quantity: number;
    mixture: { id: string; name: string };
    volumeMl: number;
    packets: { label: string; name: string | null; netMass: number; document: { id: string; status: string } | null }[];
  }[];
}

export interface VariantOption {
  id: string;
  mixtureName: string;
  volumeMl: number;
}

const STATUS_LABEL: Record<string, string> = { SZKIC: 'szkic', DO_PRZEGLADU: 'do przeglądu', ZATWIERDZONA: 'zatwierdzona' };
const STATUS: Record<string, string> = {
  SZKIC: 'bg-slate-100 text-slate-600',
  DO_PRZEGLADU: 'bg-amber-100 text-amber-800',
  ZATWIERDZONA: 'bg-emerald-100 text-emerald-800',
};

export function ProductEditor({ product: p, variants, canEdit }: { product: ProductData; variants: VariantOption[]; canEdit: boolean }) {
  const [, startTransition] = useTransition();
  const run = <T,>(promise: Promise<ActionResult<T>>, ok?: string) => startTransition(async () => void (await attempt(promise, ok)));

  const used = new Set(p.items.map((i) => i.variantId));
  const groups = new Map<string, VariantOption[]>();
  for (const v of variants) groups.set(v.mixtureName, [...(groups.get(v.mixtureName) ?? []), v]);

  return (
    <fieldset disabled={!canEdit} className="space-y-6">
      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-4">
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">Nazwa produktu</label>
          <input
            className="field text-base font-semibold"
            defaultValue={p.name}
            key={p.name}
            onBlur={(e) => e.target.value !== p.name && run(updateProduct(p.id, { name: e.target.value }), 'Zapisano.')}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">SKU</label>
          <input
            className="field font-mono"
            defaultValue={p.sku ?? ''}
            key={p.sku}
            onBlur={(e) => e.target.value !== (p.sku ?? '') && run(updateProduct(p.id, { sku: e.target.value }), 'Zapisano.')}
          />
        </div>
        <div className="sm:col-span-4">
          <label className="mb-1 block text-xs font-medium text-slate-600">Opis</label>
          <input
            className="field"
            defaultValue={p.description ?? ''}
            key={p.description}
            onBlur={(e) => e.target.value !== (p.description ?? '') && run(updateProduct(p.id, { description: e.target.value }), 'Zapisano.')}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-2">Mieszanina</th>
              <th className="w-24 px-4 py-2">Wariant</th>
              <th className="w-24 px-4 py-2">Sztuk</th>
              <th className="px-4 py-2">Opakowania w zestawie</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {p.items.map((i) => (
              <tr key={i.id} className="align-top">
                <td className="px-4 py-3">
                  <Link href={`/mieszaniny/${i.mixture.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                    {i.mixture.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{formatVolume(i.volumeMl)}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="1"
                    className="cell-field w-16"
                    defaultValue={i.quantity}
                    key={i.quantity}
                    onBlur={(e) => Number(e.target.value) !== i.quantity && run(updateProductItem(i.id, Number(e.target.value)))}
                  />
                </td>
                <td className="px-4 py-3">
                  <ul className="space-y-1">
                    {i.packets.map((pk) => (
                      <li key={pk.label} className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-700">
                          {pk.label ? pk.name || `część ${pk.label}` : 'opakowanie'} · {formatMass(pk.netMass)}
                        </span>
                        {pk.document ? (
                          <Link href={`/dokumenty/${pk.document.id}`} className={`badge ${STATUS[pk.document.status]}`}>
                            SDS: {STATUS_LABEL[pk.document.status]}
                          </Link>
                        ) : (
                          <Link href={`/mieszaniny/${i.mixture.id}`} className="badge bg-red-100 text-red-700">
                            brak SDS — utwórz
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-2 py-3">
                  <button className="btn-danger px-2" onClick={() => run(removeProductItem(i.id))} title="Usuń z zestawu">
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {p.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Zestaw jest pusty — dodaj warianty mieszanin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-slate-100 p-3">
          <select
            className="field"
            value=""
            onChange={(e) => e.target.value && run(addProductItem(p.id, e.target.value), 'Dodano do zestawu.')}
          >
            <option value="">+ Dodaj opakowanie mieszaniny (wariant)…</option>
            {[...groups].map(([name, vs]) => (
              <optgroup key={name} label={name}>
                {vs.map((v) => (
                  <option key={v.id} value={v.id} disabled={used.has(v.id)}>
                    {name} — {formatVolume(v.volumeMl)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </section>

      <div className="flex justify-end">
        <button className="btn-danger" onClick={() => confirm(`Usunąć produkt „${p.name}”?`) && startTransition(() => deleteProduct(p.id))}>
          Usuń produkt
        </button>
      </div>
    </fieldset>
  );
}
