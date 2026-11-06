'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'pending' | 'saved' | 'error';

/**
 * Trzyma wartość lokalnie (natychmiastowa reakcja UI) i zapisuje ją
 * na serwerze po okresie bezczynności. Zwraca też stan zapisu.
 *
 * Gwarancje:
 *  - zmiany są zapisywane przy odmontowaniu (np. przełączenie sekcji
 *    przed upływem debounce'a) — brak utraty danych;
 *  - dane z serwera (`initial`) nadpisują stan lokalny tylko wtedy,
 *    gdy nie ma niezapisanych zmian — bez „cofania” tego, co użytkownik
 *    właśnie wpisał podczas rundy zapisu.
 */
export function useAutosave<T>(
  initial: T,
  save: (value: T) => Promise<void>,
  delay = 700,
): [T, (next: T) => void, SaveState, () => void] {
  const [value, setValue] = useState<T>(initial);
  const [state, setState] = useState<SaveState>('idle');

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value); // ostatnia wartość widoczna dla użytkownika
  const savedSnapshot = useRef(JSON.stringify(initial)); // ostatnia wartość potwierdzona po stronie serwera
  const dirty = useRef(false); // czy są niezapisane zmiany
  const saveRef = useRef(save);
  saveRef.current = save;
  const mounted = useRef(true);

  // Zsynchronizuj z serwerem tylko, gdy nie edytujemy (brak dirty)
  // i gdy dane faktycznie się różnią od ostatnio potwierdzonych.
  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    if (dirty.current) return; // nie nadpisuj bieżącej edycji
    if (initialKey === savedSnapshot.current) return; // bez zmian
    savedSnapshot.current = initialKey;
    latest.current = initial;
    setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const persist = useCallback(async (val: T, silent = false) => {
    const snapshot = JSON.stringify(val);
    if (snapshot === savedSnapshot.current) {
      // Nic się nie zmieniło względem serwera.
      dirty.current = false;
      if (!silent && mounted.current) setState('idle');
      return;
    }
    try {
      if (!silent && mounted.current) setState('pending');
      await saveRef.current(val);
      savedSnapshot.current = snapshot;
      dirty.current = false;
      if (!silent && mounted.current) {
        setState('saved');
        setTimeout(() => mounted.current && setState((s) => (s === 'saved' ? 'idle' : s)), 1800);
      }
    } catch {
      if (!silent && mounted.current) setState('error');
    }
  }, []);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    void persist(latest.current);
  }, [persist]);

  const update = useCallback(
    (next: T) => {
      latest.current = next;
      dirty.current = true;
      setValue(next);
      setState('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  // Zapis przy odmontowaniu, jeśli zostały niezapisane zmiany.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (dirty.current) void persist(latest.current, true);
    };
  }, [persist]);

  return [value, update, state, flush];
}
