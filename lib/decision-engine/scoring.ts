import type { PersonalContextEntry } from "@/lib/context/types";
import { findMatches, maxImportance, type ContextMatch } from "@/lib/decision-engine/context-matching";
import type { DecisionEngineInput } from "@/lib/decision-engine/types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const INTENT_URGENCY: Record<string, number> = {
  ACTION_REQUIRED: 5,
  ALERT: 4,
  REMINDER: 3,
  TRANSACTION: 2,
  CONFIRMATION: 1,
  UPDATE: 1,
  INFORMATION: 0,
  PROMOTION: 0,
  OTHER: 0,
};

/** How time-sensitive the intent itself signals this communication to be. */
export function scoreUrgency(input: DecisionEngineInput): number {
  return INTENT_URGENCY[input.intent] ?? 0;
}

/** Whether the communication asks the user to actually do something. */
export function scoreActionRequired(input: DecisionEngineInput, now: Date = new Date()): number {
  const hasRequestedAction = Boolean(input.requested_action && input.requested_action.trim().length > 0);
  if (!hasRequestedAction) return 0;
  // A promotion's call to action ("Order now", "Register") is the sender's ask,
  // not an obligation on the user.
  if (input.intent === "PROMOTION") return 0;
  if (input.intent === "ACTION_REQUIRED") return 5;

  // The model often labels an overdue bill as ALERT rather than ACTION_REQUIRED.
  // An explicit ask with a deadline within 3 days (or already missed) is an
  // obligation regardless of the intent label.
  if (input.deadline) {
    const deadline = new Date(input.deadline);
    if (!Number.isNaN(deadline.getTime()) && (deadline.getTime() - now.getTime()) / MS_PER_DAY <= 3) {
      return 5;
    }
  }
  return 3;
}

const CATEGORY_IMPACT_BASE: Record<string, number> = {
  FINANCIAL: 4,
  TRAVEL: 3,
  WORK: 3,
  SHOPPING: 2,
  SUBSCRIPTION: 2,
  MARKETING: 1,
  SOCIAL: 1,
  OTHER: 1,
};

/** How much this would matter if ignored — category baseline, bumped by amount and severity. */
export function scoreImpact(input: DecisionEngineInput): number {
  let score = CATEGORY_IMPACT_BASE[input.category] ?? 1;

  if (input.amount != null) {
    if (input.amount >= 10000) score = Math.max(score, 5);
    else if (input.amount >= 1000) score = Math.max(score, 4);
    else if (input.amount > 0) score = Math.max(score, 3);
  }

  if (input.intent === "ALERT") {
    score += 1;
  }

  return clamp(score, 0, 5);
}

/** How close the deadline (or event date, as a fallback) is to `now`. */
export function scoreDeadlineProximity(input: DecisionEngineInput, now: Date): number {
  const dateStr = input.deadline ?? input.event_date;
  if (!dateStr) return 0;
  const isDeadline = Boolean(input.deadline);

  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return 0;

  const diffDays = (target.getTime() - now.getTime()) / MS_PER_DAY;

  // A deadline in the past is overdue (urgent). An event date in the past is
  // just something that already happened (a debit, a sign-in) — not pressure.
  // One day of grace keeps "today" events, which parse as midnight, urgent.
  if (!isDeadline && diffDays < -1) return 0;

  if (diffDays <= 1) return 5; // overdue, due today, or due tomorrow
  if (diffDays <= 3) return 4;
  if (diffDays <= 7) return 3;
  if (diffDays <= 14) return 2;
  return 1;
}

/** How important the *sender* is, independent of what the message is about. */
export function scoreSenderImportance(
  input: DecisionEngineInput,
  context: PersonalContextEntry[],
): { score: number; matches: ContextMatch[] } {
  const matches = findMatches([input.sender, input.sender_name, input.organization], context);
  return { score: maxImportance(matches), matches };
}

/** How relevant the *content* is (people, projects, subscriptions mentioned), beyond the sender. */
export function scorePersonalRelevance(
  input: DecisionEngineInput,
  context: PersonalContextEntry[],
): { score: number; matches: ContextMatch[] } {
  const candidates = [...(input.people ?? []), ...(input.entities ?? []), input.product_service];
  const matches = findMatches(candidates, context);
  return { score: maxImportance(matches), matches };
}
