import type { CommunicationCategory, CommunicationIntent } from "@/types/communication";
import type { PersonalContextType } from "@/lib/context/types";

export const ATTENTION_LEVELS = [
  "ACT_NOW",
  "REVIEW",
  "WATCH",
  "LOW_PRIORITY",
  "NO_ACTION",
] as const;

export type AttentionLevel = (typeof ATTENTION_LEVELS)[number];

/** Everything the decision engine needs, already extracted by the AI layer.
 * The engine never talks to the AI or the database directly — it is pure. */
export interface DecisionEngineInput {
  category: CommunicationCategory;
  intent: CommunicationIntent;
  organization: string | null;
  people: string[] | null;
  entities: string[] | null;
  product_service: string | null;
  deadline: string | null;
  event_date: string | null;
  amount: number | null;
  requested_action: string | null;
  sender: string;
  sender_name: string | null;
}

export interface DecisionFactorScores {
  urgency: number;
  action_required: number;
  impact: number;
  personal_relevance: number;
  deadline_proximity: number;
  sender_importance: number;
}

export interface MatchedContextEntry {
  context_type: PersonalContextType;
  key: string;
  importance: number;
  matched_on: "sender" | "content";
}

export interface DecisionResult {
  level: AttentionLevel;
  scores: DecisionFactorScores;
  overallScore: number;
  reason: string;
  matchedContext: MatchedContextEntry[];
  decisionVersion: string;
}
