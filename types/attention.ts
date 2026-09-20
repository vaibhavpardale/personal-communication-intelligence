import type { AttentionLevel, DecisionFactorScores, MatchedContextEntry } from "@/lib/decision-engine/types";
import type { Communication, CommunicationAnalysis } from "@/types/communication";

export interface AttentionDecision {
  id: string;
  communication_id: string;
  level: AttentionLevel;
  scores: DecisionFactorScores;
  overall_score: number;
  reason: string;
  matched_context: MatchedContextEntry[] | null;
  decision_version: string;
  why_it_matters: string | null;
  what_you_can_do: string | null;
  explanation_model: string | null;
  explanation_prompt_version: string | null;
  created_at: string;
}

export interface CommunicationWithAttention extends Communication {
  analysis: CommunicationAnalysis | null;
  attention: AttentionDecision | null;
}
