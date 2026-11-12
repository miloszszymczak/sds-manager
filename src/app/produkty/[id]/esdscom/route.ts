import { prisma } from '@/server/db';
import { getCurrentUser } from '@/server/auth/session';
import { loadEsdscomInput, loadRenderCatalogs } from '@/server/documents';
import { buildEsdscom, type EsdscomInput } from '@/lib/esdscom';
import { slug } from '@/lib/slug';
import { xmlResponse } from '@/server/xml-response';

export const dynamic = 'force-dynamic';

/** Wszystkie karty zestawu w jednym pliku eSDScom XML (kilka elementów Datasheet). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response('Wymagane logowanie', { status: 401 });
  const product = await prisma.product.findUnique({
    where: { id: (await params).id },
    include: {
      items: {
        orderBy: { position: 'asc' },
        include: { variant: { include: { documents: { select: { id: true, packet: { select: { position: true } } } } } } },
      },
    },
  });
  if (!product) return new Response('Nie znaleziono produktu', { status: 404 });
  const ids = product.items.flatMap((i) =>
    [...i.variant.documents].sort((a, b) => (a.packet?.position ?? 0) - (b.packet?.position ?? 0)).map((d) => d.id),
  );
  if (ids.length === 0) return new Response('Zestaw nie ma kart charakterystyki', { status: 404 });
  const catalogs = await loadRenderCatalogs();
  const inputs = (await Promise.all(ids.map((id) => loadEsdscomInput(id, catalogs)))).filter((x): x is EsdscomInput => x !== null);
  return xmlResponse(buildEsdscom(inputs), slug(product.name));
}
