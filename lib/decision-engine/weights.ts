import type { AttentionLevel, DecisionFactorScores } from "@/lib/decision-engine/types";

export const DECISION_VERSION = "decision-engine-v1";

/** Kept configurable and out of any component so tuning never means touching UI code. */
export const FACTOR_WEIGHTS: Record<keyof DecisionFactorScores, number> = {
  urgency: 1.2,
  action_required: 1.3,
  impact: 1.0,
  personal_relevance: 0.8,
  deadline_proximity: 1.2,
  sender_importance: 0.6,
};

/** Minimum weighted-average score (0-5 scale) required for each level. */
export const ATTENTION_THRESHOLDS: Record<Exclude<AttentionLevel, "NO_ACTION">, number> = {
  ACT_NOW: 3.6,
  REVIEW: 2.6,
  WATCH: 1.6,
  LOW_PRIORITY: 0.6,
};
