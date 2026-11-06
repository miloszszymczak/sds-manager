import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/session';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect('/');
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 font-bold text-white">KCh</span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Karty charakterystyki</h1>
            <p className="text-xs text-slate-500">Zaloguj się, aby kontynuować</p>
          </div>
        </div>
        <LoginForm next={next ?? '/'} />
      </div>
    </main>
  );
}
