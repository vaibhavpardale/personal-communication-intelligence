import { analyzeCommunication } from "@/lib/ai/analyze-communication";
import { saveAnalysis } from "@/lib/db/communications";
import { saveAttentionDecision } from "@/lib/db/attention";
import { buildDecisionInput } from "@/lib/decision-engine/build-input";
import { decideAttention } from "@/lib/decision-engine/decide";
import { logError, logInfo } from "@/lib/observability/logger";
import type { Communication, CommunicationAnalysis } from "@/types/communication";
import type { AttentionDecision } from "@/types/attention";
import type { PersonalContextEntry } from "@/lib/context/types";

export type ProcessCommunicationResult =
  | { status: "success"; analysis: CommunicationAnalysis; attention: AttentionDecision }
  | { status: "error"; error: string };

type ProcessableCommunication = Pick<
  Communication,
  "id" | "sender" | "sender_name" | "subject" | "content" | "received_at"
>;

/**
 * Runs one communication through the full pipeline: AI understanding ->
 * (with personal context) the deterministic decision engine -> persistence.
 * Failures are caught and reported per-item so a batch run (analyze-all)
 * never fails as a whole because of a single bad response.
 */
export async function processCommunication(
  communication: ProcessableCommunication,
  personalContext: PersonalContextEntry[] = [],
): Promise<ProcessCommunicationResult> {
  try {
    const { analysis, model, promptVersion } = await analyzeCommunication(communication);
    const savedAnalysis = await saveAnalysis(communication.id, analysis, model, promptVersion);

    const decision = decideAttention(
      buildDecisionInput(communication, savedAnalysis),
      personalContext,
    );
    const savedAttention = await saveAttentionDecision(communication.id, decision);

    logInfo("communication.processed", {
      communicationId: communication.id,
      model,
      promptVersion,
      category: analysis.category,
      intent: analysis.intent,
      attentionLevel: decision.level,
      decisionVersion: decision.decisionVersion,
    });

    return { status: "success", analysis: savedAnalysis, attention: savedAttention };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logError("communication.process_failed", {
      communicationId: communication.id,
      error: message,
    });
    return { status: "error", error: message };
  }
}
