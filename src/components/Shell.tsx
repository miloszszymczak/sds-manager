import Link from 'next/link';
import { getCurrentUser } from '@/server/auth/session';
import { logout } from '@/server/actions/auth';
import { ROLE_LABEL } from '@/lib/roles';

export type Section = 'pulpit' | 'produkty' | 'mieszaniny' | 'substancje' | 'dokumenty' | 'szablony' | 'uzytkownicy';

const NAV: { href: string; label: string; key: Section; admin?: boolean }[] = [
  { href: '/', label: 'Pulpit', key: 'pulpit' },
  { href: '/produkty', label: 'Produkty', key: 'produkty' },
  { href: '/mieszaniny', label: 'Mieszaniny', key: 'mieszaniny' },
  { href: '/substancje', label: 'Substancje', key: 'substancje' },
  { href: '/dokumenty', label: 'Karty SDS', key: 'dokumenty' },
  { href: '/szablony', label: 'Szablony', key: 'szablony' },
  { href: '/uzytkownicy', label: 'Użytkownicy', key: 'uzytkownicy', admin: true },
];

/** Wspólna rama aplikacji: nawigacja i menu użytkownika. */
export async function Shell({ children, active }: { children: React.ReactNode; active?: Section }) {
  const user = await getCurrentUser();
  return (
    <div className="min-h-full">
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">KCh</span>
            <span className="hidden text-[15px] font-semibold tracking-tight lg:inline">Karty charakterystyki</span>
          </Link>
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {NAV.filter((n) => !n.admin || user?.role === 'ADMIN').map((n) => (
              <Link
                key={n.key}
                href={n.href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  active === n.key ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          {user && (
            <div className="ml-auto flex shrink-0 items-center gap-3 text-sm">
              <Link href="/konto" className="text-right leading-tight hover:text-brand-700">
                <div className="font-medium text-slate-800">{user.name}</div>
                <div className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</div>
              </Link>
              <form action={logout}>
                <button className="btn-ghost px-2 text-xs">Wyloguj</button>
              </form>
            </div>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

/** Ścieżka okruszków nad tytułem strony. */
export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span>/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-slate-600">
              {it.label}
            </Link>
          ) : (
            <span className="text-slate-600">{it.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
