'use client';

import { useEffect, useState } from 'react';
import type { ActionResult } from '@/lib/action-result';

type Tone = 'info' | 'success' | 'error';
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const listeners = new Set<(t: Toast) => void>();
let seq = 0;

/** Globalny komunikat (bez kontekstu React — można wołać z dowolnego miejsca klienta). */
export function toast(text: string, tone: Tone = 'info') {
  const t = { id: ++seq, text, tone };
  listeners.forEach((l) => l(t));
}

/** Rozpakowuje wynik akcji: błąd → komunikat + wyjątek (np. dla stanu autozapisu). */
export async function call<T>(promise: Promise<ActionResult<T>>, success?: string): Promise<T> {
  let r: ActionResult<T>;
  try {
    r = await promise;
  } catch (e) {
    // Brak połączenia albo nowa wersja aplikacji (po wdrożeniu stare akcje znikają).
    toast('Nie udało się zapisać — sprawdź połączenie lub odśwież stronę (mogła zostać wdrożona nowa wersja).', 'error');
    throw e;
  }
  if (!r.ok) {
    toast(r.error, 'error');
    throw new Error(r.error);
  }
  if (success) toast(success, 'success');
  return r.data;
}

/** Jak `call`, ale bez wyjątku — zwraca undefined przy błędzie (do akcji „wystrzel i zapomnij”). */
export async function attempt<T>(promise: Promise<ActionResult<T>>, success?: string): Promise<T | undefined> {
  try {
    return await call(promise, success);
  } catch {
    return undefined;
  }
}

const TONE: Record<Tone, string> = {
  info: 'border-slate-200 bg-white text-slate-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const add = (t: Toast) => {
      setItems((xs) => [...xs.slice(-3), t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.tone === 'error' ? 7000 : 3500);
    };
    listeners.add(add);
    return () => void listeners.delete(add);
  }, []);
  return (
    <div className="no-print pointer-events-none fixed right-4 bottom-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${TONE[t.tone]}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
