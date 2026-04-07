/**
 * Normalize a search query: uppercase, remove accents, trim.
 */
export function normalizeSearch(q: string): string {
  return q
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
