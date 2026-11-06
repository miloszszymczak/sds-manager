import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from '@/server/db';
import type { Role } from '@/lib/roles';

export const SESSION_COOKIE = 'sds_session';
const SESSION_TTL_MS = 14 * 24 * 3600 * 1000;
/** Odnów sesję, gdy do wygaśnięcia zostało mniej niż tyle. */
const RENEW_BELOW_MS = 7 * 24 * 3600 * 1000;

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.SESSION_COOKIE_SECURE !== 'false',
    path: '/',
    expires,
  };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Bieżący użytkownik (memoizowany na czas jednego żądania). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, active: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;

  // Sesja przesuwna: odnawiamy, gdy minęła połowa ważności.
  if (session.expiresAt.getTime() - Date.now() < RENEW_BELOW_MS) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt } });
    try {
      jar.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
    } catch {
      // Render komponentu serwerowego nie może ustawiać ciasteczek — odnowi je najbliższa akcja.
    }
  }

  const { id, email, name, role } = session.user;
  return { id, email, name, role };
});

/** Okresowe sprzątanie wygasłych sesji (wywoływane przy logowaniu). */
export async function purgeExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
