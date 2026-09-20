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
  created_at: string;
}

export interface CommunicationWithAttention extends Communication {
  analysis: CommunicationAnalysis | null;
  attention: AttentionDecision | null;
}
