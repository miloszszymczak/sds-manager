'use client';

import { useState, useTransition } from 'react';
import { changeOwnPassword } from '@/server/actions/auth';
import { attempt } from '@/components/ui/toast';

export function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (next !== repeat) return alert('Hasła nie są identyczne.');
        startTransition(async () => {
          if ((await attempt(changeOwnPassword(current, next), 'Hasło zmienione.')) !== undefined) {
            setCurrent('');
            setNext('');
            setRepeat('');
          }
        });
      }}
    >
      <h2 className="text-sm font-semibold text-slate-800">Zmiana hasła</h2>
      <input className="field" type="password" autoComplete="current-password" placeholder="Obecne hasło" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      <input className="field" type="password" autoComplete="new-password" placeholder="Nowe hasło (min. 10 znaków)" value={next} onChange={(e) => setNext(e.target.value)} required />
      <input className="field" type="password" autoComplete="new-password" placeholder="Powtórz nowe hasło" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
      <button disabled={pending} className="btn-primary">
        Zmień hasło
      </button>
    </form>
  );
}
