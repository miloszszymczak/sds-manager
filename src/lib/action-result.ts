/** Wynik akcji serwerowej wywoływanej z klienta. Błędy oczekiwane wracają jako wartość. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };
