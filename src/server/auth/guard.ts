import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { hasRole, type Role } from '@/lib/roles';
import { getCurrentUser, type CurrentUser } from './session';

export class ForbiddenError extends Error {
  constructor(message = 'Brak uprawnień do tej operacji.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Wymaga zalogowanego, aktywnego użytkownika o co najmniej danej roli.
 * Brak sesji → przekierowanie do logowania; za niska rola → ForbiddenError.
 * Każda strona i każda akcja serwerowa zaczyna się od tego wywołania.
 */
export async function requireUser(role: Role = 'VIEWER'): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!hasRole(user.role, role)) throw new ForbiddenError();
  return user;
}

/**
 * Wariant dla stron: za niska rola → 404 (strona „nie istnieje” dla tego użytkownika)
 * zamiast błędu 500 z rzuconego wyjątku.
 */
export async function requirePageUser(role: Role = 'VIEWER'): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!hasRole(user.role, role)) notFound();
  return user;
}
