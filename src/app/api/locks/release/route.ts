import { z } from 'zod';
import { getCurrentUser } from '@/server/auth/session';
import { releaseLock } from '@/server/locks';
import type { LockResource } from '@/lib/locks';

const body = z.object({ resource: z.string().regex(/^(document|mixture):[A-Za-z0-9_-]{1,64}$/) });

/** Zwolnienie blokady przy zamknięciu karty przeglądarki (navigator.sendBeacon). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  await releaseLock(parsed.data.resource as LockResource, user.id);
  return new Response(null, { status: 204 });
}
