import { getSupabaseClient } from "@/lib/db/supabase-client";
import type { DecisionResult } from "@/lib/decision-engine/types";
import type { AttentionDecision } from "@/types/attention";

export async function saveAttentionDecision(
  communicationId: string,
  decision: DecisionResult,
): Promise<AttentionDecision> {
  const supabase = getSupabaseClient();
  const row = {
    communication_id: communicationId,
    level: decision.level,
    scores: decision.scores,
    overall_score: decision.overallScore,
    reason: decision.reason,
    matched_context: decision.matchedContext,
    decision_version: decision.decisionVersion,
  };

  const { data, error } = await supabase
    .from("attention_decisions")
    .upsert(row, { onConflict: "communication_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save attention decision for ${communicationId}: ${error.message}`);
  }

  return data as AttentionDecision;
}
