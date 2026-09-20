import type { PersonalContextEntry } from "@/lib/context/types";

export interface ContextMatch {
  entry: PersonalContextEntry;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Matches candidate strings (sender, people, organization, ...) against
 * seeded personal context by simple case-insensitive substring containment.
 * Deliberately not fuzzy matching or embeddings — this is a small, explicit
 * personal context table, not a search index.
 */
export function findMatches(
  candidates: (string | null | undefined)[],
  context: PersonalContextEntry[],
): ContextMatch[] {
  const names = candidates
    .filter((c): c is string => !!c && c.trim().length > 0)
    .map(normalize);

  if (names.length === 0) return [];

  return context
    .filter((entry) => {
      const key = normalize(entry.key);
      if (key.length === 0) return false;
      return names.some((name) => name.includes(key) || key.includes(name));
    })
    .map((entry) => ({ entry }));
}

export function maxImportance(matches: ContextMatch[]): number {
  return matches.reduce((max, m) => Math.max(max, m.entry.importance), 0);
}
