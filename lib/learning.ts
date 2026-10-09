import { senderAddress, type SenderPreferenceMap } from "@/lib/decision-engine/preferences";
import type { AttentionLevel } from "@/lib/decision-engine/types";
import type { FeedbackType } from "@/types/feedback";

/** One message, reduced to what Pith can learn from: what it was rated, and what the user did with it. */
export interface LearningRow {
  sender: string;
  senderName: string | null;
  status: "unread" | "read" | "hidden";
  level: AttentionLevel | null;
  feedback: FeedbackType[];
}

export interface Suggestion {
  /** Lowercased address. */
  sender: string;
  name: string;
  kind: "mute" | "vip";
  /** Plain-words evidence, so the user can see why Pith is asking. */
  reason: string;
  /** How many messages the suggestion rests on. */
  evidence: number;
}

const MAX_SUGGESTIONS = 5;
const MIN_EVIDENCE = 2;
const SHOWN = (level: AttentionLevel | null) => level === "ACT_NOW" || level === "REVIEW" || level === "WATCH";
const URGENT = (level: AttentionLevel | null) => level === "ACT_NOW" || level === "REVIEW";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Suggestions come only from the user's own actions, never from anyone else's, and always at least
 * two data points. A sender is suggested for muting only if Pith is still showing you their mail.
 */
export function suggestPreferences(rows: LearningRow[], existing: SenderPreferenceMap): Suggestion[] {
  const bySender = new Map<string, LearningRow[]>();
  for (const row of rows) {
    const key = senderAddress(row.sender);
    bySender.set(key, [...(bySender.get(key) ?? []), row]);
  }

  const suggestions: Suggestion[] = [];
  for (const [sender, group] of bySender) {
    if (existing[sender]) continue;
    const name = group.find((r) => r.senderName)?.senderName ?? sender;

    const hidden = group.filter((r) => r.status === "hidden").length;
    const notImportant = group.filter((r) => r.feedback.some((f) => f === "NOT_IMPORTANT" || f === "DISMISS")).length;
    const important = group.filter((r) => r.feedback.includes("IMPORTANT")).length;
    const handledUrgent = group.filter((r) => r.status === "read" && URGENT(r.level)).length;

    const negative = hidden + notImportant;
    const positive = important + handledUrgent;

    if (positive === 0 && negative >= MIN_EVIDENCE && group.some((r) => r.status === "unread" && SHOWN(r.level))) {
      const parts = [hidden > 0 && `hid ${plural(hidden, "message")}`, notImportant > 0 && `marked ${notImportant} not important`].filter(Boolean);
      suggestions.push({ sender, name, kind: "mute", reason: `You ${parts.join(" and ")} from this sender.`, evidence: negative });
    } else if (negative === 0 && positive >= MIN_EVIDENCE) {
      const parts = [important > 0 && `marked ${important} important`, handledUrgent > 0 && `handled ${plural(handledUrgent, "urgent message")}`].filter(Boolean);
      suggestions.push({ sender, name, kind: "vip", reason: `You ${parts.join(" and ")} from this sender.`, evidence: positive });
    }
  }

  return suggestions.sort((a, b) => b.evidence - a.evidence).slice(0, MAX_SUGGESTIONS);
}
