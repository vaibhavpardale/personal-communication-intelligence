import type { AnalysisResult } from "@/lib/validation/analysis-schema";
import type { CommunicationAnalysis } from "@/types/communication";

export type AnalysisInsertRow = Omit<CommunicationAnalysis, "id" | "created_at">;

/** Pure mapping from a validated AI result to the row we persist. Kept
 * side-effect free so it is testable without a database. */
export function toAnalysisInsertRow(
  communicationId: string,
  analysis: AnalysisResult,
  model: string,
  promptVersion: string,
): AnalysisInsertRow {
  return {
    communication_id: communicationId,
    category: analysis.category,
    intent: analysis.intent,
    organization: analysis.organization,
    people: analysis.people,
    entities: analysis.entities,
    event_date: analysis.event_date,
    deadline: analysis.deadline,
    amount: analysis.amount,
    currency: analysis.currency,
    product_service: analysis.product_service,
    reference_id: analysis.reference_id,
    requested_action: analysis.requested_action,
    summary: analysis.summary,
    confidence: analysis.confidence,
    model,
    prompt_version: promptVersion,
  };
}
