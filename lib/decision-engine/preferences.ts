import type { PersonalContextEntry } from "@/lib/context/types";
import { decideAttention } from "@/lib/decision-engine/decide";
import type { DecisionEngineInput, DecisionResult } from "@/lib/decision-engine/types";

export const SENDER_PREFERENCES = ["vip", "muted"] as const;
export type SenderPreference = (typeof SENDER_PREFERENCES)[number];
/** Keyed by lowercased email address. */
export type SenderPreferenceMap = Record<string, SenderPreference>;

/** "Anthropic <no-reply@mail.anthropic.com>" or a bare address, as a lowercased address. */
export function senderAddress(sender: string): string {
  const match = /<([^>]+)>/.exec(sender);
  return (match ? match[1] : sender).trim().toLowerCase();
}

/** A VIP is expressed through the same personal-context mechanism as any other important person, so it shows up in the decision's evidence. */
function vipEntry(address: string): PersonalContextEntry {
  const now = new Date().toISOString();
  return {
    id: `vip:${address}`,
    context_type: "IMPORTANT_PERSON",
    key: address,
    value: "Marked VIP by you",
    importance: 5,
    confidence: 1,
    created_at: now,
    updated_at: now,
  };
}

/** The normal decision, adjusted for what the user has said about this sender. */
export function decideWithPreferences(
  input: DecisionEngineInput,
  context: PersonalContextEntry[],
  preferences: SenderPreferenceMap,
  now?: Date,
): DecisionResult {
  const address = senderAddress(input.sender);
  const preference = preferences[address];
  const decision = decideAttention(input, preference === "vip" ? [...context, vipEntry(address)] : context, now);

  if (preference === "muted" && (decision.level === "ACT_NOW" || decision.level === "REVIEW" || decision.level === "WATCH")) {
    return { ...decision, level: "LOW_PRIORITY", reason: `You muted this sender. ${decision.reason}` };
  }
  return decision;
}
