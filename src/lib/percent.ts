/**
 * Zamienia zapis stężenia (np. „71,4", „70-80", „1-2,5") na liczbę [%].
 * Dla zakresu bierze wartość górną (podejście najgorszego przypadku),
 * właściwe dla klasyfikacji i walidacji. Czysta funkcja (client + server).
 */
export function parsePercent(raw: string | null | undefined): number {
  if (!raw) return 0;
  const nums = raw
    .replace(/,/g, '.')
    .match(/\d+(\.\d+)?/g)
    ?.map(Number);
  if (!nums || nums.length === 0) return 0;
  return Math.max(...nums);
}
