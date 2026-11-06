'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

/** Przełącznik języka podglądu (F4.3) — zmienia parametr ?lang w URL. */
export function LanguageSwitch({ current }: { current: 'pl' | 'en' }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (lang: 'pl' | 'en') => {
    const p = new URLSearchParams(params.toString());
    if (lang === 'pl') p.delete('lang');
    else p.set('lang', lang);
    router.replace(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-300 p-0.5">
      {(['pl', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          className={`rounded px-2 py-0.5 text-xs font-medium uppercase transition ${
            current === l ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
