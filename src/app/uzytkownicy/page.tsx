import { prisma } from '@/server/db';
import { requirePageUser } from '@/server/auth/guard';
import { Shell } from '@/components/Shell';
import { UsersAdmin } from '@/components/users/UsersAdmin';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const me = await requirePageUser('ADMIN');
  const [users, locks] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.editLock.findMany({ where: { expiresAt: { gt: new Date() } }, select: { userId: true } }),
  ]);
  const editing = new Map<string, number>();
  for (const l of locks) editing.set(l.userId, (editing.get(l.userId) ?? 0) + 1);

  return (
    <Shell active="uzytkownicy">
      <main className="mx-auto max-w-[1100px] px-5 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Użytkownicy</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Administrator zarządza kontami; edytor tworzy i zmienia dane; podgląd tylko przegląda i eksportuje.
        </p>
        <UsersAdmin
          meId={me.id}
          users={users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            active: u.active,
            lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
            editing: editing.get(u.id) ?? 0,
          }))}
        />
      </main>
    </Shell>
  );
}
