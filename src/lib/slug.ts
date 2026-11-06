/** Nazwa pliku z nazwy produktu (bez polskich znaków i znaków specjalnych). */
export function slug(s: string, max = 80): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max);
}
