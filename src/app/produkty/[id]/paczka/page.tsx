import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { buildRenderData, loadRenderCatalogs } from '@/server/documents';
import { DocumentRenderer } from '@/components/render/DocumentRenderer';
import { PackDownload } from '@/components/render/PackDownload';
import { slug } from '@/lib/slug';

export const dynamic = 'force-dynamic';

/** Wszystkie karty SDS zestawu na jednej stronie + eksport ZIP samodzielnych plików HTML. */
export default async function ProductPackPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageUser();
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: 'asc' },
        include: { variant: { include: { documents: { select: { id: true, packet: { select: { position: true } } } } } } },
      },
    },
  });
  if (!product) notFound();

  const ids = product.items.flatMap((i) =>
    [...i.variant.documents].sort((a, b) => (a.packet?.position ?? 0) - (b.packet?.position ?? 0)).map((d) => d.id),
  );
  const catalogs = await loadRenderCatalogs();
  const cards = (await Promise.all(ids.map((d) => buildRenderData(d, catalogs)))).filter((d) => d !== null);

  return (
    <div className="min-h-full bg-slate-200 print:bg-white">
      <div className="no-print sticky top-0 z-30 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-3 px-5 py-3">
          <Link href={`/produkty/${id}`} className="btn-ghost">
            ← Wróć do produktu
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
            {product.name} — {cards.length} {cards.length === 1 ? 'karta' : 'kart'}
          </span>
          {cards.length > 0 && <PackDownload folderName={product.name} />}
        </div>
      </div>
      {cards.length === 0 ? (
        <p className="py-16 text-center text-slate-500">Zestaw nie ma jeszcze kart charakterystyki.</p>
      ) : (
        <div className="space-y-8 py-8 print:py-0">
          {cards.map((data, i) => (
            <div key={i} data-card data-filename={slug(data.productName)} data-title={data.productName}>
              <DocumentRenderer data={data} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
