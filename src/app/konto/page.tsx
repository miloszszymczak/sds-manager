import { requirePageUser } from '@/server/auth/guard';
import { ROLE_LABEL } from '@/lib/roles';
import { Shell } from '@/components/Shell';
import { ChangePassword } from '@/components/users/ChangePassword';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requirePageUser();
  return (
    <Shell>
      <main className="mx-auto max-w-[600px] px-5 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Moje konto</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          {user.name} · {user.email} · {ROLE_LABEL[user.role]}
        </p>
        <ChangePassword />
      </main>
    </Shell>
  );
}
