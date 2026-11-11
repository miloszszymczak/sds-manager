'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  addDilution,
  addMixtureComponent,
  addPacket,
  addVariant,
  deleteMixture,
  deletePacket,
  deleteVariant,
  removeDilution,
  removeMixtureComponent,
  renamePacket,
  syncMixtureDocuments,
  updateDilution,
  updateMixture,
  updateMixtureComponent,
} from '@/server/actions/mixtures';
import { createDilutionDocument, createVariantDocuments } from '@/server/actions/documents';
import {
  formatMass,
  formatPercent,
  formatVolume,
  packetComposition,
  packetMass,
  variantFactor,
  workingSolution,
  type CompositionInput,
  type Unit,
} from '@/lib/mixture';
import { mixtureLock, type LockState } from '@/lib/locks';
import { useEditLock } from '@/components/locks/useEditLock';
import { LockBanner } from '@/components/locks/LockBanner';
import { SubstanceSelect, type SubstanceOption } from '@/components/ui/SubstanceSelect';
import { attempt, toast } from '@/components/ui/toast';
import type { ActionResult } from '@/lib/action-result';

export interface MixtureData {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  form: string;
  basisVolumeMl: number;
  notes: string | null;
  packets: { id: string; label: string; name: string | null }[];
  components: {
    id: string;
    packetId: string;
    cas: string;
    name: string;
    quantity: number;
    unit: Unit;
    density: number | null;
    note: string | null;
  }[];
  variants: {
    id: string;
    volumeMl: number;
    sku: string | null;
    products: { id: string; name: string }[];
    documents: { id: string; packetId: string | null; productName: string; status: string }[];
  }[];
  dilutions: { id: string; name: string; waterMl: number; documentId: string | null }[];
}

const STATUS: Record<string, string> = {
  SZKIC: 'bg-slate-100 text-slate-600',
  DO_PRZEGLADU: 'bg-amber-100 text-amber-800',
  ZATWIERDZONA: 'bg-emerald-100 text-emerald-800',
};
const STATUS_LABEL: Record<string, string> = { SZKIC: 'szkic', DO_PRZEGLADU: 'do przeglądu', ZATWIERDZONA: 'zatwierdzona' };

export function MixtureEditor({
  mixture: m,
  substances,
  lock,
  canEdit,
  isAdmin,
}: {
  mixture: MixtureData;
  substances: SubstanceOption[];
  lock: LockState;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const { state, editable, check, takeOver } = useEditLock(mixtureLock(m.id), lock, canEdit);
  const [pending, startTransition] = useTransition();

  /** Wywołanie akcji: komunikat przy błędzie, ponowne sprawdzenie blokady. */
  const run = <T,>(p: Promise<ActionResult<T>>, ok?: string) =>
    startTransition(async () => {
      const r = await attempt(p, ok);
      if (r === undefined) void check();
    });

  // Wersje robocze ilości — % przelicza się na żywo, zapis przy opuszczeniu pola.
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const serverKey = m.components.map((c) => `${c.id}:${c.quantity}:${c.unit}:${c.packetId}`).join('|');
  useEffect(() => setDrafts({}), [serverKey]);

  const inputs: CompositionInput[] = useMemo(
    () =>
      m.components.map((c) => ({
        key: c.id,
        packetId: c.packetId,
        quantity: drafts[c.id] ?? c.quantity,
        unit: c.unit,
        density: c.density,
      })),
    [m.components, drafts],
  );
  const percent = useMemo(() => {
    const map = new Map<string, { percent: number; assumedDensity: boolean }>();
    for (const p of m.packets) for (const r of packetComposition(inputs, p.id)) map.set(r.key, r);
    return map;
  }, [inputs, m.packets]);

  const multi = m.packets.length > 1;
  const packetTitle = (p: MixtureData['packets'][number]) => (p.label ? p.name || `część ${p.label}` : 'całość (jedno opakowanie)');

  return (
    <>
      <LockBanner state={state} canEdit={canEdit} isAdmin={isAdmin} onTakeOver={takeOver} what="mieszaninę" />
      <fieldset disabled={!editable} aria-busy={pending} className="mx-auto block max-w-[1200px] space-y-8 px-5 py-8">
        {/* ── Dane mieszaniny ── */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <Label>Nazwa mieszaniny</Label>
              <input
                className="field text-base font-semibold"
                defaultValue={m.name}
                key={m.name}
                onBlur={(e) => e.target.value !== m.name && run(updateMixture(m.id, { name: e.target.value }), 'Zapisano.')}
              />
            </div>
            <div>
              <Label>Kod</Label>
              <input
                className="field font-mono"
                defaultValue={m.code ?? ''}
                key={m.code}
                placeholder="np. D76"
                onBlur={(e) => e.target.value !== (m.code ?? '') && run(updateMixture(m.id, { code: e.target.value }), 'Zapisano.')}
              />
            </div>
            <div>
              <Label>Postać</Label>
              <select
                className="field"
                value={m.form}
                onChange={(e) => run(updateMixture(m.id, { form: e.target.value as 'POWDER' }), 'Zapisano.')}
              >
                <option value="POWDER">proszek</option>
                <option value="LIQUID">ciecz (koncentrat)</option>
                <option value="PASTE">pasta</option>
              </select>
            </div>
            <div>
              <Label>Objętość odniesienia [ml]</Label>
              <input
                type="number"
                min="1"
                className="field"
                defaultValue={m.basisVolumeMl}
                key={m.basisVolumeMl}
                onBlur={(e) =>
                  Number(e.target.value) !== m.basisVolumeMl && run(updateMixture(m.id, { basisVolumeMl: Number(e.target.value) }), 'Zapisano.')
                }
              />
              <p className="mt-1 text-xs text-slate-400">Ilości składników podajesz na tę objętość roztworu.</p>
            </div>
            <div className="sm:col-span-3">
              <Label>Opis</Label>
              <input
                className="field"
                defaultValue={m.description ?? ''}
                key={m.description}
                onBlur={(e) => e.target.value !== (m.description ?? '') && run(updateMixture(m.id, { description: e.target.value }), 'Zapisano.')}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Label>Uwagi technologiczne</Label>
              <textarea
                rows={2}
                className="field"
                defaultValue={m.notes ?? ''}
                key={m.notes}
                onBlur={(e) => e.target.value !== (m.notes ?? '') && run(updateMixture(m.id, { notes: e.target.value }), 'Zapisano.')}
              />
            </div>
          </div>
        </section>

        {/* ── Skład ── */}
        <section>
          <SectionTitle
            title="Skład"
            hint={`Ilości na ${formatVolume(m.basisVolumeMl)} roztworu. Każde opakowanie ma własną kartę charakterystyki.`}
          >
            <button className="btn-outline" onClick={() => run(addPacket(m.id))}>
              + Dodaj opakowanie
            </button>
          </SectionTitle>

          <div className="space-y-4">
            {m.packets.map((p) => {
              const rows = m.components.filter((c) => c.packetId === p.id);
              const total = packetMass(inputs, p.id);
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                    {p.label && <span className="badge bg-brand-50 font-mono text-brand-700">{p.label}</span>}
                    {multi ? (
                      <input
                        className="cell-field max-w-64 font-medium"
                        defaultValue={p.name ?? ''}
                        key={p.name}
                        placeholder={`część ${p.label}`}
                        onBlur={(e) => e.target.value !== (p.name ?? '') && run(renamePacket(p.id, e.target.value))}
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-700">{packetTitle(p)}</span>
                    )}
                    <span className="ml-auto text-xs text-slate-500">
                      masa na {formatVolume(m.basisVolumeMl)}: <strong>{formatMass(total)}</strong>
                    </span>
                    {multi && (
                      <button className="btn-danger px-2 text-xs" onClick={() => run(deletePacket(p.id))} title="Usuń opakowanie">
                        Usuń
                      </button>
                    )}
                  </div>

                  <table className="w-full text-sm">
                    <thead className="text-left text-xs font-semibold text-slate-400">
                      <tr>
                        <th className="px-4 py-2">Substancja</th>
                        <th className="w-28 px-2 py-2">Ilość</th>
                        <th className="w-20 px-2 py-2">Jedn.</th>
                        {multi && <th className="w-32 px-2 py-2">Opakowanie</th>}
                        <th className="w-24 px-2 py-2 text-right">% m/m</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((c) => {
                        const pc = percent.get(c.id);
                        return (
                          <tr key={c.id}>
                            <td className="px-4 py-2">
                              <Link href={`/substancje/${encodeURIComponent(c.cas)}`} className="font-medium text-slate-800 hover:text-brand-700">
                                {c.name}
                              </Link>
                              <span className="ml-2 font-mono text-xs text-slate-400">{c.cas}</span>
                              {c.note && <div className="text-xs text-amber-700">{c.note}</div>}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className="cell-field w-24 text-right"
                                value={drafts[c.id] ?? c.quantity}
                                onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: Number(e.target.value) }))}
                                onBlur={() =>
                                  drafts[c.id] !== undefined &&
                                  drafts[c.id] !== c.quantity &&
                                  run(updateMixtureComponent(c.id, { quantity: drafts[c.id] }))
                                }
                              />
                            </td>
                            <td className="px-2 py-2">
                              <select
                                className="cell-field"
                                value={c.unit}
                                onChange={(e) => run(updateMixtureComponent(c.id, { unit: e.target.value as Unit }))}
                              >
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                              </select>
                            </td>
                            {multi && (
                              <td className="px-2 py-2">
                                <select
                                  className="cell-field"
                                  value={c.packetId}
                                  onChange={(e) => run(updateMixtureComponent(c.id, { packetId: e.target.value }))}
                                >
                                  {m.packets.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.label} — {o.name || `część ${o.label}`}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )}
                            <td className="px-2 py-2 text-right font-mono">
                              {formatPercent(pc?.percent ?? 0, 2)}
                              {pc?.assumedDensity && (
                                <span className="ml-1 text-amber-600" title="Brak gęstości substancji — przyjęto 1 g/ml">
                                  *
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button className="btn-danger px-2" onClick={() => run(removeMixtureComponent(c.id))} title="Usuń składnik">
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="border-t border-slate-100 p-3">
                    <SubstanceSelect
                      options={substances}
                      exclude={rows.map((r) => r.cas)}
                      onSelect={(cas) => run(addMixtureComponent(m.id, cas, p.id))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Warianty objętościowe ── */}
        <section>
          <SectionTitle title="Warianty objętościowe" hint="Wariant skaluje ilości składników. Każde opakowanie wariantu ma swoją kartę SDS.">
            <AddVariant onAdd={(ml) => run(addVariant(m.id, ml), 'Dodano wariant.')} />
          </SectionTitle>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-2">Wariant</th>
                  {m.packets.map((p) => (
                    <th key={p.id} className="px-4 py-2">
                      {p.label ? `Opakowanie ${p.label}` : 'Opakowanie'}
                    </th>
                  ))}
                  <th className="px-4 py-2">Produkty</th>
                  <th className="w-48 px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {m.variants.map((v) => {
                  const factor = variantFactor(v.volumeMl, m.basisVolumeMl);
                  const missing = m.packets.filter((p) => !v.documents.some((d) => d.packetId === p.id)).length;
                  return (
                    <tr key={v.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{formatVolume(v.volumeMl)}</div>
                        {v.sku && <div className="font-mono text-xs text-slate-400">{v.sku}</div>}
                      </td>
                      {m.packets.map((p) => {
                        const doc = v.documents.find((d) => d.packetId === p.id);
                        return (
                          <td key={p.id} className="px-4 py-3">
                            <div className="text-slate-700">masa netto {formatMass(packetMass(inputs, p.id, factor))}</div>
                            {doc ? (
                              <Link href={`/dokumenty/${doc.id}`} className="mt-1 inline-flex items-center gap-1.5 text-xs text-brand-700 hover:underline">
                                Karta SDS <span className={`badge ${STATUS[doc.status]}`}>{STATUS_LABEL[doc.status]}</span>
                              </Link>
                            ) : (
                              <div className="mt-1 text-xs text-red-600">brak karty SDS</div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-xs">
                        {v.products.length === 0 && <span className="text-slate-400">—</span>}
                        {v.products.map((pr) => (
                          <Link key={pr.id} href={`/produkty/${pr.id}`} className="block text-brand-700 hover:underline">
                            {pr.name}
                          </Link>
                        ))}
                      </td>
                      <td className="space-y-1.5 px-4 py-3 text-right">
                        {missing > 0 && (
                          <button
                            className="btn-primary px-2 py-1 text-xs"
                            onClick={() => run(createVariantDocuments(v.id), `Utworzono karty (${missing}).`)}
                          >
                            Utwórz karty ({missing})
                          </button>
                        )}
                        {v.documents.length === 0 && v.products.length === 0 && (
                          <button className="btn-danger px-2 py-1 text-xs" onClick={() => run(deleteVariant(v.id))}>
                            Usuń wariant
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Nowe karty kopiują treść karty tego samego opakowania z innego wariantu (skład %m/m jest identyczny); w przeciwnym
            razie powstaje szkic z sekcją 3 i klasyfikacją wyliczoną przez silnik CLP.
          </p>
        </section>

        {/* ── Roztwory robocze ── */}
        <section>
          <SectionTitle title="Roztwory robocze" hint="Wszystkie opakowania rozpuszczone razem + woda. Masa roztworu = składniki + woda (1 g/ml).">
            <button className="btn-outline" onClick={() => run(addDilution(m.id, 'Roztwór roboczy', m.basisVolumeMl))}>
              + Dodaj roztwór
            </button>
          </SectionTitle>
          <div className="space-y-3">
            {m.dilutions.map((d) => (
              <Dilution key={d.id} step={d} inputs={inputs} components={m.components} run={run} />
            ))}
            {m.dilutions.length === 0 && <Empty>Brak zdefiniowanych roztworów roboczych.</Empty>}
          </div>
        </section>

        {/* ── Akcje ── */}
        <section className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6">
          <button
            className="btn-primary"
            onClick={() =>
              startTransition(async () => {
                const r = await attempt(syncMixtureDocuments(m.id));
                if (!r) return;
                toast(`Zaktualizowano sekcję 3 w ${r.updated} kartach.`, 'success');
                if (r.skipped.length) toast(`Pominięto (edytowane przez innych): ${r.skipped.join('; ')}`, 'error');
              })
            }
          >
            Synchronizuj sekcję 3 wszystkich kart
          </button>
          <span className="text-xs text-slate-500">Po zmianie składu zaktualizuj karty — sekcja 3 zostanie odtworzona z receptury.</span>
          <button
            className="btn-danger ml-auto"
            onClick={() => confirm(`Usunąć mieszaninę „${m.name}”?`) && run(deleteMixture(m.id))}
          >
            Usuń mieszaninę
          </button>
        </section>
      </fieldset>
    </>
  );
}

function Dilution({
  step,
  inputs,
  components,
  run,
}: {
  step: MixtureData['dilutions'][number];
  inputs: CompositionInput[];
  components: MixtureData['components'];
  run: <T>(p: Promise<ActionResult<T>>, ok?: string) => void;
}) {
  const conc = workingSolution(inputs, step.waterMl, 3);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Label>Nazwa</Label>
          <input
            className="field"
            defaultValue={step.name}
            key={step.name}
            onBlur={(e) => e.target.value !== step.name && run(updateDilution(step.id, { name: e.target.value }))}
          />
        </div>
        <div className="w-40">
          <Label>Woda [ml]</Label>
          <input
            type="number"
            min="0"
            className="field"
            defaultValue={step.waterMl}
            key={step.waterMl}
            onBlur={(e) => Number(e.target.value) !== step.waterMl && run(updateDilution(step.id, { waterMl: Number(e.target.value) }))}
          />
        </div>
        {step.documentId ? (
          <Link href={`/dokumenty/${step.documentId}`} className="btn-outline">
            Karta roztworu →
          </Link>
        ) : (
          <button className="btn-outline" onClick={() => run(createDilutionDocument(step.id), 'Utworzono kartę roztworu.')}>
            Utwórz kartę roztworu
          </button>
        )}
        <button className="btn-danger px-2" onClick={() => run(removeDilution(step.id))} title="Usuń roztwór">
          ×
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
        {conc.map((r) => (
          <span key={r.key}>
            {components.find((c) => c.id === r.key)?.name}: <strong className="font-mono">{formatPercent(r.percent, 3)} %</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function AddVariant({ onAdd }: { onAdd: (ml: number) => void }) {
  const [ml, setMl] = useState('');
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (Number(ml) > 0) onAdd(Number(ml));
        setMl('');
      }}
    >
      <input type="number" min="1" placeholder="objętość [ml]" value={ml} onChange={(e) => setMl(e.target.value)} className="field w-36" />
      <button className="btn-outline">+ Wariant</button>
    </form>
  );
}

function SectionTitle({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1 block text-xs font-medium text-slate-600">{children}</label>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">{children}</p>
);
