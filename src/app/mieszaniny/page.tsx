import Link from 'next/link';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { createMixture } from '@/server/actions/mixtures';
import { hasRole } from '@/lib/roles';
import { formatVolume } from '@/lib/mixture';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function MixturesPage() {
  const user = await requirePageUser();
  const mixtures = await prisma.mixture.findMany({
    orderBy: { name: 'asc' },
    include: {
      packets: { select: { id: true } },
      variants: { orderBy: { volumeMl: 'desc' }, select: { volumeMl: true, _count: { select: { documents: true } } } },
      _count: { select: { components: true } },
    },
  });

  return (
    <Shell active="mieszaniny">
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mieszaniny</h1>
            <p className="mt-1 text-sm text-slate-500">
              Receptury z substancji, podzielone na opakowania, w wariantach objętościowych — każde opakowanie wariantu ma kartę SDS.
            </p>
          </div>
          {hasRole(user.role, 'EDITOR') && (
            <form action={createMixture} className="flex gap-2">
              <input name="name" placeholder="Nazwa nowej mieszaniny" className="field w-64" required />
              <button className="btn-primary">+ Nowa mieszanina</button>
            </form>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Mieszanina</th>
                <th className="w-28 px-4 py-3">Kod</th>
                <th className="w-28 px-4 py-3">Składniki</th>
                <th className="w-28 px-4 py-3">Opakowania</th>
                <th className="px-4 py-3">Warianty / karty SDS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mixtures.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <Link href={`/mieszaniny/${m.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {m.name}
                    </Link>
                    {m.description && <div className="text-xs text-slate-400">{m.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.code ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{m._count.components}</td>
                  <td className="px-4 py-3 text-slate-600">{m.packets.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {m.variants.map((v) => {
                        const complete = v._count.documents >= m.packets.length;
                        return (
                          <span
                            key={v.volumeMl}
                            className={`badge ${complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                            title={`${v._count.documents}/${m.packets.length} kart`}
                          >
                            {formatVolume(v.volumeMl)} · {v._count.documents}/{m.packets.length}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </Shell>
  );
}
