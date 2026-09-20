import type { CommunicationCategory, CommunicationIntent } from "@/types/communication";
import { ATTENTION_LEVELS, type AttentionLevel } from "@/lib/decision-engine/types";

export interface EvaluationExample {
  communication_id: string;
  expected_category: CommunicationCategory;
  expected_intent: CommunicationIntent;
  expected_attention_level: AttentionLevel;
  actual_category: CommunicationCategory | null;
  actual_intent: CommunicationIntent | null;
  actual_attention_level: AttentionLevel | null;
}

export interface ClassMetrics {
  /** null when the system never predicted this class (precision is undefined, not 0). */
  precision: number | null;
  /** null when the golden set has no examples of this class (recall is undefined, not 0). */
  recall: number | null;
  support: number;
}

export interface EvaluationSummary {
  totalDatasetSize: number;
  evaluatedCount: number;
  pendingCount: number;
  categoryAccuracy: number | null;
  intentAccuracy: number | null;
  decisionAccuracy: number | null;
  perLevel: Record<AttentionLevel, ClassMetrics>;
}

function computeAccuracy(
  examples: EvaluationExample[],
  expectedKey: "expected_category" | "expected_intent" | "expected_attention_level",
  actualKey: "actual_category" | "actual_intent" | "actual_attention_level",
): number | null {
  const evaluated = examples.filter((e) => e[actualKey] != null);
  if (evaluated.length === 0) return null;
  const correct = evaluated.filter((e) => e[expectedKey] === e[actualKey]).length;
  return correct / evaluated.length;
}

export function computeCategoryAccuracy(examples: EvaluationExample[]): number | null {
  return computeAccuracy(examples, "expected_category", "actual_category");
}

export function computeIntentAccuracy(examples: EvaluationExample[]): number | null {
  return computeAccuracy(examples, "expected_intent", "actual_intent");
}

export function computeDecisionAccuracy(examples: EvaluationExample[]): number | null {
  return computeAccuracy(examples, "expected_attention_level", "actual_attention_level");
}

export function computeClassMetrics(
  examples: EvaluationExample[],
  level: AttentionLevel,
): ClassMetrics {
  const evaluated = examples.filter((e) => e.actual_attention_level != null);
  const predictedPositive = evaluated.filter((e) => e.actual_attention_level === level);
  const actualPositive = evaluated.filter((e) => e.expected_attention_level === level);
  const truePositive = evaluated.filter(
    (e) => e.actual_attention_level === level && e.expected_attention_level === level,
  ).length;

  return {
    precision: predictedPositive.length > 0 ? truePositive / predictedPositive.length : null,
    recall: actualPositive.length > 0 ? truePositive / actualPositive.length : null,
    support: actualPositive.length,
  };
}

export function summarizeEvaluation(examples: EvaluationExample[]): EvaluationSummary {
  const evaluated = examples.filter((e) => e.actual_attention_level != null);
  const perLevel = Object.fromEntries(
    ATTENTION_LEVELS.map((level) => [level, computeClassMetrics(examples, level)]),
  ) as Record<AttentionLevel, ClassMetrics>;

  return {
    totalDatasetSize: examples.length,
    evaluatedCount: evaluated.length,
    pendingCount: examples.length - evaluated.length,
    categoryAccuracy: computeCategoryAccuracy(examples),
    intentAccuracy: computeIntentAccuracy(examples),
    decisionAccuracy: computeDecisionAccuracy(examples),
    perLevel,
  };
}
