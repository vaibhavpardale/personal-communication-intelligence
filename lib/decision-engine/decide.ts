import type { PersonalContextEntry } from "@/lib/context/types";
import {
  scoreActionRequired,
  scoreDeadlineProximity,
  scoreImpact,
  scorePersonalRelevance,
  scoreSenderImportance,
  scoreUrgency,
} from "@/lib/decision-engine/scoring";
import type {
  AttentionLevel,
  DecisionEngineInput,
  DecisionFactorScores,
  DecisionResult,
  MatchedContextEntry,
} from "@/lib/decision-engine/types";
import { ATTENTION_THRESHOLDS, DECISION_VERSION, FACTOR_WEIGHTS } from "@/lib/decision-engine/weights";
import type { ContextMatch } from "@/lib/decision-engine/context-matching";

function classify(overallScore: number): AttentionLevel {
  if (overallScore >= ATTENTION_THRESHOLDS.ACT_NOW) return "ACT_NOW";
  if (overallScore >= ATTENTION_THRESHOLDS.REVIEW) return "REVIEW";
  if (overallScore >= ATTENTION_THRESHOLDS.WATCH) return "WATCH";
  if (overallScore >= ATTENTION_THRESHOLDS.LOW_PRIORITY) return "LOW_PRIORITY";
  return "NO_ACTION";
}

function buildReason(scores: DecisionFactorScores, level: AttentionLevel): string {
  const parts: string[] = [];

  if (scores.action_required >= 4) parts.push("this requires action");
  else if (scores.action_required >= 2) parts.push("this may require some action");

  if (scores.deadline_proximity >= 5) parts.push("the deadline is today or tomorrow");
  else if (scores.deadline_proximity >= 4) parts.push("the deadline is very close");
  else if (scores.deadline_proximity >= 2) parts.push("there is an upcoming deadline");

  if (scores.impact >= 4) parts.push("the potential impact is high");

  if (scores.sender_importance >= 4 || scores.personal_relevance >= 4) {
    parts.push("it involves someone or something important to you");
  }

  if (parts.length === 0) {
    return level === "NO_ACTION"
      ? "No specific action or meaningful personal relevance was identified."
      : "No strong urgency or personal relevance signals were found, but it may still be worth a glance.";
  }

  const sentence = `A communication where ${parts.join(", and ")}.`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function toMatchedContext(
  senderMatches: ContextMatch[],
  contentMatches: ContextMatch[],
): MatchedContextEntry[] {
  const sender = senderMatches.map((m) => ({
    context_type: m.entry.context_type,
    key: m.entry.key,
    importance: m.entry.importance,
    matched_on: "sender" as const,
  }));
  const content = contentMatches.map((m) => ({
    context_type: m.entry.context_type,
    key: m.entry.key,
    importance: m.entry.importance,
    matched_on: "content" as const,
  }));
  return [...sender, ...content];
}

/**
 * The deterministic core of the product: application code — not the LLM —
 * decides what deserves attention. See lib/decision-engine/scoring.ts for
 * each individual factor.
 */
export function decideAttention(
  input: DecisionEngineInput,
  personalContext: PersonalContextEntry[] = [],
  now: Date = new Date(),
): DecisionResult {
  const sender = scoreSenderImportance(input, personalContext);
  const relevance = scorePersonalRelevance(input, personalContext);

  const scores: DecisionFactorScores = {
    urgency: scoreUrgency(input),
    action_required: scoreActionRequired(input),
    impact: scoreImpact(input),
    personal_relevance: relevance.score,
    deadline_proximity: scoreDeadlineProximity(input, now),
    sender_importance: sender.score,
  };

  const factorKeys = Object.keys(scores) as (keyof DecisionFactorScores)[];
  const weightedSum = factorKeys.reduce((sum, key) => sum + scores[key] * FACTOR_WEIGHTS[key], 0);
  const totalWeight = factorKeys.reduce((sum, key) => sum + FACTOR_WEIGHTS[key], 0);
  const overallScore = Math.round((weightedSum / totalWeight) * 100) / 100;

  const level = classify(overallScore);

  return {
    level,
    scores,
    overallScore,
    reason: buildReason(scores, level),
    matchedContext: toMatchedContext(sender.matches, relevance.matches),
    decisionVersion: DECISION_VERSION,
  };
}
