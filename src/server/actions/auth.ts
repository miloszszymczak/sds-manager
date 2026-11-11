'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { createSession, destroySession, purgeExpiredSessions } from '@/server/auth/session';
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from '@/server/auth/password';
import { requireUser } from '@/server/auth/guard';
import { result, UserError } from '@/server/errors';
import { loginThrottle } from '@/server/auth/throttle';

export interface LoginState {
  error?: string;
}

const safeNext = (next: unknown) =>
  typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Podaj e-mail i hasło.' };

  if (!loginThrottle.allow(email)) return { error: 'Zbyt wiele nieudanych prób. Spróbuj za kilka minut.' };

  const user = await prisma.user.findUnique({ where: { email } });
  // Weryfikujemy hasło także dla nieistniejącego konta — stały czas odpowiedzi.
  const ok = await verifyPassword(password, user?.passwordHash ?? 'scrypt$16384$8$1$AAAA$AAAA');
  if (!user || !ok || !user.active) {
    loginThrottle.fail(email);
    return { error: 'Nieprawidłowy e-mail lub hasło.' };
  }

  loginThrottle.reset(email);
  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await purgeExpiredSessions();
  redirect(safeNext(form.get('next')));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect('/login');
}

const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH, `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`);

export async function changeOwnPassword(current: string, next: string) {
  return result(async () => {
    const me = await requireUser();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(current, user.passwordHash))) throw new UserError('Obecne hasło jest nieprawidłowe.');
    const passwordHash = await hashPassword(passwordSchema.parse(next));
    // Zmiana hasła wylogowuje wszystkie urządzenia; bieżące dostaje nową sesję.
    await prisma.$transaction([
      prisma.user.update({ where: { id: me.id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: me.id } }),
    ]);
    await createSession(me.id);
    return 'Hasło zmienione.';
  });
}
