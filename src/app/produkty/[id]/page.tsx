import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { loadProduct } from '@/server/products';
import { hasRole } from '@/lib/roles';
import { Shell, Crumbs } from '@/components/Shell';
import { ProductEditor } from '@/components/products/ProductEditor';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const [product, variants] = await Promise.all([
    loadProduct(id),
    prisma.mixtureVariant.findMany({
      orderBy: [{ mixture: { name: 'asc' } }, { volumeMl: 'desc' }],
      select: { id: true, volumeMl: true, mixture: { select: { name: true } } },
    }),
  ]);
  if (!product) notFound();

  const packets = product.items.flatMap((i) => i.packets);
  const ready = packets.filter((p) => p.document?.status === 'ZATWIERDZONA').length;

  return (
    <Shell active="produkty">
      <main className="mx-auto max-w-[1200px] px-5 py-8">
        <Crumbs items={[{ href: '/produkty', label: 'Produkty' }, { label: product.name }]} />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Zatwierdzone karty SDS: <strong>{ready}</strong> / {packets.length} opakowań
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/produkty/${id}/esdscom`} className="btn-outline" title="Wszystkie karty zestawu w jednym pliku eSDScom XML 5.6">
              eSDScom XML
            </a>
            <Link href={`/produkty/${id}/paczka`} className="btn-primary">
              📦 Paczka kart SDS (ZIP)
            </Link>
          </div>
        </div>
        <ProductEditor
          product={product}
          canEdit={hasRole(user.role, 'EDITOR')}
          variants={variants.map((v) => ({ id: v.id, volumeMl: v.volumeMl, mixtureName: v.mixture.name }))}
        />
      </main>
    </Shell>
  );
}
