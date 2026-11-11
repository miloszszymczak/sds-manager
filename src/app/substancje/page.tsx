import Link from 'next/link';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { hasRole } from '@/lib/roles';
import { freshnessOf, FRESHNESS_LABEL } from '@/lib/freshness';
import { Shell } from '@/components/Shell';
import { HAZARD_CLASS_BY_CODE } from '@/data/hazard-classes';
import { NewSubstanceForm } from '@/components/substances/NewSubstanceForm';

export const dynamic = 'force-dynamic';

const FRESH_STYLE = { never: 'bg-slate-100 text-slate-500', fresh: 'bg-emerald-50 text-emerald-700', stale: 'bg-amber-50 text-amber-700' };

export default async function SubstancesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requirePageUser();
  const q = (await searchParams).q?.trim() ?? '';
  const substances = await prisma.substance.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { nameEn: { contains: q, mode: 'insensitive' } }, { cas: { contains: q } }] }
      : undefined,
    orderBy: { name: 'asc' },
    include: { hazards: { where: { limitOnly: false }, select: { hazardClass: true }, orderBy: { position: 'asc' } }, _count: { select: { mixtureComponents: true } } },
  });

  return (
    <Shell active="substancje">
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Substancje</h1>
            <p className="mt-1 text-sm text-slate-500">
              Biblioteka substancji identyfikowanych numerem CAS — źródło składu mieszanin i klasyfikacji.
            </p>
          </div>
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Szukaj: nazwa lub CAS" className="field w-64" />
            <button className="btn-outline">Szukaj</button>
          </form>
        </div>

        {hasRole(user.role, 'EDITOR') && <NewSubstanceForm />}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="w-32 px-4 py-3">CAS</th>
                <th className="px-4 py-3">Nazwa</th>
                <th className="w-32 px-4 py-3">WE</th>
                <th className="px-4 py-3">Klasyfikacja</th>
                <th className="w-28 px-4 py-3">Mieszaniny</th>
                <th className="w-36 px-4 py-3">Dane</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {substances.map((s) => {
                const f = freshnessOf(s.lastVerified);
                return (
                  <tr key={s.cas} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/substancje/${encodeURIComponent(s.cas)}`} className="text-brand-700 hover:underline">
                        {s.cas}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/substancje/${encodeURIComponent(s.cas)}`} className="font-medium text-slate-900 hover:text-brand-700">
                        {s.name}
                      </Link>
                      {s.nameEn && <div className="text-xs text-slate-400">{s.nameEn}</div>}
                      {s.isSvhc && <span className="badge mt-1 bg-red-100 text-red-700">SVHC</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.ecNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.hazards.length === 0 && <span className="text-xs text-slate-400">brak danych / nieklasyfikowana</span>}
                        {[...new Set(s.hazards.map((h) => h.hazardClass))].map((c) => (
                          <span key={c} className="badge bg-amber-50 text-amber-800" title={HAZARD_CLASS_BY_CODE.get(c)?.namePl}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{s._count.mixtureComponents || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${FRESH_STYLE[f]}`}>{FRESHNESS_LABEL[f]}</span>
                    </td>
                  </tr>
                );
              })}
              {substances.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    {q ? 'Brak wyników.' : 'Biblioteka jest pusta.'}
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
