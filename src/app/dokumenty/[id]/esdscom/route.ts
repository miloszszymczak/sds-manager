import { getCurrentUser } from '@/server/auth/session';
import { loadEsdscomInput } from '@/server/documents';
import { buildEsdscom } from '@/lib/esdscom';
import { slug } from '@/lib/slug';
import { xmlResponse } from '@/server/xml-response';

export const dynamic = 'force-dynamic';

/** Pobranie karty w formacie eSDScom XML 5.6. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response('Wymagane logowanie', { status: 401 });
  const input = await loadEsdscomInput((await params).id);
  if (!input) return new Response('Nie znaleziono karty', { status: 404 });
  return xmlResponse(buildEsdscom(input), slug(input.productName));
}
