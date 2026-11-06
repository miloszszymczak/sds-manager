import 'server-only';

/**
 * Prosty limiter nieudanych logowań (w pamięci poda). Przy kilku replikach to
 * ochrona „najlepszego wysiłku” — docelowo ogranicz też żądania na ingressie.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

const failures = new Map<string, number[]>();

const recent = (key: string) => (failures.get(key) ?? []).filter((t) => Date.now() - t < WINDOW_MS);

export const loginThrottle = {
  allow: (key: string) => recent(key).length < MAX_FAILURES,
  fail: (key: string) => failures.set(key, [...recent(key), Date.now()]),
  reset: (key: string) => failures.delete(key),
};
