import { getSupabaseClient } from "@/lib/db/supabase-client";
import type { DecisionResult } from "@/lib/decision-engine/types";
import type { AttentionDecision } from "@/types/attention";

export interface DecisionExplanation {
  why_it_matters: string;
  what_you_can_do: string;
  model: string;
  promptVersion: string;
}

export async function saveAttentionDecision(
  communicationId: string,
  decision: DecisionResult,
  explanation?: DecisionExplanation | null,
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
    why_it_matters: explanation?.why_it_matters ?? null,
    what_you_can_do: explanation?.what_you_can_do ?? null,
    explanation_model: explanation?.model ?? null,
    explanation_prompt_version: explanation?.promptVersion ?? null,
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
