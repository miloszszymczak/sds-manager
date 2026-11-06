import Link from 'next/link';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { createStandaloneDocument, duplicateDocument, deleteDocument } from '@/server/actions/documents';
import { hasRole } from '@/lib/roles';
import { formatVolume } from '@/lib/mixture';
import { Shell } from '@/components/Shell';
import { ActionButton } from '@/components/ui/ActionButton';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, [string, string]> = {
  SZKIC: ['Szkic', 'bg-slate-100 text-slate-600'],
  DO_PRZEGLADU: ['Do przeglądu', 'bg-amber-100 text-amber-800'],
  ZATWIERDZONA: ['Zatwierdzona', 'bg-emerald-100 text-emerald-800'],
};

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requirePageUser();
  const { status, q } = await searchParams;
  const docs = await prisma.document.findMany({
    where: {
      ...(status && status in STATUS ? { status: status as 'SZKIC' } : {}),
      ...(q ? { productName: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      updatedBy: { select: { name: true } },
      variant: { select: { volumeMl: true, mixture: { select: { id: true, name: true } } } },
      packet: { select: { label: true } },
      dilution: { select: { name: true, mixture: { select: { id: true, name: true } } } },
      _count: { select: { components: true } },
    },
  });
  const locks = await prisma.editLock.findMany({
    where: { resource: { in: docs.map((d) => `document:${d.id}`) }, expiresAt: { gt: new Date() } },
    include: { user: { select: { name: true } } },
  });
  const lockedBy = new Map(locks.map((l) => [l.resource.slice('document:'.length), l.user.name]));
  const canEdit = hasRole(user.role, 'EDITOR');

  return (
    <Shell active="dokumenty">
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Karty charakterystyki</h1>
            <p className="mt-1 text-sm text-slate-500">
              Karty powstają z wariantów mieszanin (zakładka „Mieszaniny”); tu znajdziesz wszystkie, także samodzielne.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="Szukaj po nazwie" className="field w-56" />
              <select name="status" defaultValue={status ?? ''} className="field w-40">
                <option value="">każdy status</option>
                {Object.entries(STATUS).map(([k, [l]]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              <button className="btn-outline">Filtruj</button>
            </form>
            {canEdit && (
              <form action={createStandaloneDocument} className="flex gap-2">
                <input name="productName" placeholder="Nazwa karty samodzielnej" className="field w-56" />
                <button className="btn-primary">+ Karta</button>
              </form>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Produkt</th>
                <th className="px-4 py-3">Mieszanina</th>
                <th className="w-20 px-4 py-3">Wersja</th>
                <th className="w-32 px-4 py-3">Status</th>
                <th className="w-52 px-4 py-3">Zmiana</th>
                <th className="w-40 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((d) => {
                const mixture = d.variant?.mixture ?? d.dilution?.mixture;
                const holder = lockedBy.get(d.id);
                return (
                  <tr key={d.id} className="group hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/dokumenty/${d.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                        {d.productName}
                      </Link>
                      {holder && <div className="mt-0.5 text-xs text-amber-700">🔒 edytuje: {holder}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {mixture ? (
                        <Link href={`/mieszaniny/${mixture.id}`} className="hover:text-brand-700">
                          {mixture.name}
                          {d.variant && ` · ${formatVolume(d.variant.volumeMl)}`}
                          {d.packet?.label && ` · ${d.packet.label}`}
                          {d.dilution && ` · ${d.dilution.name}`}
                        </Link>
                      ) : (
                        <span className="text-slate-400">samodzielna</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.version}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS[d.status][1]}`}>{STATUS[d.status][0]}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {d.updatedAt.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
                      {d.updatedBy && <div>{d.updatedBy.name}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          <form action={duplicateDocument.bind(null, d.id)}>
                            <button className="btn-ghost px-2 text-xs">Duplikuj</button>
                          </form>
                          <ActionButton
                            action={deleteDocument.bind(null, d.id)}
                            confirm={`Usunąć kartę „${d.productName}”? Tej operacji nie można cofnąć.`}
                            success="Usunięto kartę."
                            className="btn-danger px-2 text-xs"
                          >
                            Usuń
                          </ActionButton>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Brak kart.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </Shell>
  );
}
