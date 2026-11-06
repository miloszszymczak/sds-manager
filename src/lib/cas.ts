/**
 * Numer CAS: 2–7 cyfr, 2 cyfry, cyfra kontrolna (np. 7732-18-5).
 * Cyfra kontrolna = Σ(cyfra × pozycja od prawej, bez kontrolnej) mod 10.
 */
const CAS_RE = /^(\d{2,7})-(\d{2})-(\d)$/;

export function normalizeCas(raw: string): string {
  return raw.trim().replace(/\s+/g, '').replace(/[‐-―]/g, '-');
}

export function isValidCas(raw: string): boolean {
  const m = CAS_RE.exec(normalizeCas(raw));
  if (!m) return false;
  const digits = (m[1] + m[2]).split('').reverse();
  const sum = digits.reduce((s, d, i) => s + Number(d) * (i + 1), 0);
  return sum % 10 === Number(m[3]);
}
