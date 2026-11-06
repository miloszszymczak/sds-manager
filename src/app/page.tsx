import Link from 'next/link';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { freshnessOf } from '@/lib/freshness';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const user = await requirePageUser();
  const [products, mixtures, substances, statusCounts, missingDocs, recent] = await Promise.all([
    prisma.product.count(),
    prisma.mixture.count(),
    prisma.substance.findMany({ select: { lastVerified: true } }),
    prisma.document.groupBy({ by: ['status'], _count: true }),
    // opakowania wariantów bez karty
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
        FROM "MixtureVariant" v
        JOIN "MixturePacket" p ON p."mixtureId" = v."mixtureId"
       WHERE NOT EXISTS (SELECT 1 FROM "Document" d WHERE d."variantId" = v.id AND d."packetId" = p.id)`,
    prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: { id: true, productName: true, updatedAt: true, status: true, updatedBy: { select: { name: true } } },
    }),
  ]);
  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  const unverified = substances.filter((s) => freshnessOf(s.lastVerified) !== 'fresh').length;
  const missing = Number(missingDocs[0]?.count ?? 0);

  const tile = (href: string, label: string, value: number | string, hint?: string, warn = false) => (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300">
      <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${warn ? 'text-amber-600' : 'text-slate-900'}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Link>
  );

  return (
    <Shell active="pulpit">
      <main className="mx-auto max-w-[1400px] px-5 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dzień dobry, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">Stan katalogu kart charakterystyki.</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tile('/produkty', 'Produkty', products, 'zestawy do sprzedaży')}
          {tile('/mieszaniny', 'Mieszaniny', mixtures, `${missing} opakowań wariantów bez karty SDS`, missing > 0)}
          {tile('/substancje', 'Substancje', substances.length, `${unverified} do weryfikacji danych`, unverified > 0)}
          {tile(
            '/dokumenty',
            'Karty SDS',
            Object.values(byStatus).reduce((a, b) => a + b, 0),
            `${byStatus.ZATWIERDZONA ?? 0} zatwierdzonych · ${byStatus.DO_PRZEGLADU ?? 0} do przeglądu · ${byStatus.SZKIC ?? 0} szkiców`,
          )}
        </div>

        <h2 className="mt-10 mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Ostatnio zmieniane karty</h2>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {recent.map((d) => (
            <Link key={d.id} href={`/dokumenty/${d.id}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-slate-50">
              <span className="font-medium text-slate-800">{d.productName}</span>
              <span className="shrink-0 text-xs text-slate-400">
                {d.updatedBy?.name ? `${d.updatedBy.name} · ` : ''}
                {d.updatedAt.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </Link>
          ))}
          {recent.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">Brak kart.</p>}
        </div>
      </main>
    </Shell>
  );
}
