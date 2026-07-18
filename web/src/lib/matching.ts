const DIACRITICS_REGEX = new RegExp(String.fromCharCode(91, 0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findSimilarProducts<T extends { name: string }>(query: string, products: T[]): T[] {
  const normalizedQuery = normalizeName(query);
  if (normalizedQuery.length < 2) return [];
  return products.filter((p) => {
    const normalizedName = normalizeName(p.name);
    return normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);
  });
}
