export const PERSONAL_CONTEXT_TYPES = [
  "IMPORTANT_PERSON",
  "IMPORTANT_ORGANIZATION",
  "PROJECT",
  "SUBSCRIPTION",
  "RECURRING_VENDOR",
  "OTHER",
] as const;

export type PersonalContextType = (typeof PERSONAL_CONTEXT_TYPES)[number];

/** A single fact about what/who matters to the user. Deliberately flat —
 * no memory graph, just a small table the decision engine can match against. */
export interface PersonalContextEntry {
  id: string;
  context_type: PersonalContextType;
  key: string;
  value: string | null;
  importance: number; // 1 (low) – 5 (high)
  confidence: number; // 0 – 1
  created_at: string;
  updated_at: string;
}

export type NewPersonalContextEntry = Omit<
  PersonalContextEntry,
  "id" | "created_at" | "updated_at"
>;
