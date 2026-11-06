'use client';

import { useActionState } from 'react';
import { login, type LoginState } from '@/server/actions/auth';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus className="field" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="password">
          Hasło
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full justify-center">
        {pending ? 'Logowanie…' : 'Zaloguj'}
      </button>
    </form>
  );
}
