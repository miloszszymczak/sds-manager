'use client';

import { useState, useTransition } from 'react';
import { createUser, deleteUser, resetUserPassword, updateUser } from '@/server/actions/users';
import { attempt } from '@/components/ui/toast';
import { ROLE_LABEL, type Role } from '@/lib/roles';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  editing: number;
}

const ROLES: Role[] = ['ADMIN', 'EDITOR', 'VIEWER'];

export function UsersAdmin({ users, meId }: { users: UserRow[]; meId: string }) {
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({ email: '', name: '', role: 'EDITOR' as Role, password: '' });
  const run = (p: Parameters<typeof attempt>[0], ok?: string, after?: () => void) =>
    startTransition(async () => {
      if ((await attempt(p, ok)) !== undefined) after?.();
    });

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Użytkownik</th>
              <th className="w-40 px-4 py-3">Rola</th>
              <th className="w-28 px-4 py-3">Aktywny</th>
              <th className="w-44 px-4 py-3">Ostatnie logowanie</th>
              <th className="w-56 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {u.name} {u.id === meId && <span className="text-xs text-slate-400">(Ty)</span>}
                  </div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                  {u.editing > 0 && <div className="text-xs text-amber-700">🔒 edytuje: {u.editing}</div>}
                </td>
                <td className="px-4 py-3">
                  <select
                    className="field"
                    value={u.role}
                    disabled={u.id === meId}
                    onChange={(e) => run(updateUser(u.id, { role: e.target.value as Role }), 'Zmieniono rolę.')}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={u.active}
                    disabled={u.id === meId}
                    onChange={(e) => run(updateUser(u.id, { active: e.target.checked }), e.target.checked ? 'Odblokowano.' : 'Zablokowano konto.')}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pl-PL') : '—'}
                </td>
                <td className="space-x-1 px-4 py-3 text-right">
                  <button
                    className="btn-ghost px-2 text-xs"
                    onClick={() => {
                      const pw = prompt(`Nowe hasło dla ${u.name} (min. 10 znaków):`);
                      if (pw) run(resetUserPassword(u.id, pw), 'Ustawiono nowe hasło; sesje użytkownika wylogowane.');
                    }}
                  >
                    Ustaw hasło
                  </button>
                  {u.id !== meId && (
                    <button
                      className="btn-danger px-2 text-xs"
                      onClick={() => confirm(`Usunąć konto ${u.email}?`) && run(deleteUser(u.id), 'Usunięto konto.')}
                    >
                      Usuń
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(createUser(form), `Utworzono konto ${form.email}.`, () => setForm({ email: '', name: '', role: 'EDITOR', password: '' }));
        }}
      >
        <h2 className="text-sm font-semibold text-slate-800 sm:col-span-2 lg:col-span-5">Nowy użytkownik</h2>
        <input className="field" placeholder="Imię i nazwisko" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="field" type="email" placeholder="e-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          placeholder="hasło startowe (min. 10)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button className="btn-primary justify-center">Utwórz konto</button>
      </form>
    </div>
  );
}
