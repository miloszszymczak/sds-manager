import Link from 'next/link';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { createProduct } from '@/server/actions/products';
import { hasRole } from '@/lib/roles';
import { formatVolume } from '@/lib/mixture';
import { Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const user = await requirePageUser();
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      items: {
        orderBy: { position: 'asc' },
        include: {
          variant: {
            select: {
              volumeMl: true,
              mixture: { select: { name: true, _count: { select: { packets: true } } } },
              documents: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  return (
    <Shell active="produkty">
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Produkty</h1>
            <p className="mt-1 text-sm text-slate-500">Zestawy do sprzedaży złożone z opakowań mieszanin (wariantów objętościowych).</p>
          </div>
          {hasRole(user.role, 'EDITOR') && (
            <form action={createProduct} className="flex gap-2">
              <input name="name" placeholder="Nazwa nowego produktu" className="field w-64" required />
              <button className="btn-primary">+ Nowy produkt</button>
            </form>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const needed = p.items.reduce((s, i) => s + i.variant.mixture._count.packets, 0);
            const approved = p.items.reduce((s, i) => s + i.variant.documents.filter((d) => d.status === 'ZATWIERDZONA').length, 0);
            const pct = needed ? Math.round((approved / needed) * 100) : 0;
            return (
              <Link key={p.id} href={`/produkty/${p.id}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-semibold text-slate-900">{p.name}</h2>
                  {p.sku && <span className="font-mono text-xs text-slate-400">{p.sku}</span>}
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {p.items.map((i) => (
                    <li key={i.id}>
                      {i.quantity > 1 && `${i.quantity} × `}
                      {i.variant.mixture.name} — {formatVolume(i.variant.volumeMl)}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    zatwierdzone karty SDS: {approved}/{needed}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </Shell>
  );
}
