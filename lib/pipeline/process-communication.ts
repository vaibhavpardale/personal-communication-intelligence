import { analyzeCommunication } from "@/lib/ai/analyze-communication";
import { saveAnalysis } from "@/lib/db/communications";
import { logError, logInfo } from "@/lib/observability/logger";
import type { Communication, CommunicationAnalysis } from "@/types/communication";

export type ProcessCommunicationResult =
  | { status: "success"; analysis: CommunicationAnalysis }
  | { status: "error"; error: string };

type ProcessableCommunication = Pick<
  Communication,
  "id" | "sender" | "sender_name" | "subject" | "content" | "received_at"
>;

/**
 * Runs one communication through AI understanding and persists the result.
 * Failures are caught and reported per-item so a batch run (analyze-all)
 * never fails as a whole because of a single bad response.
 */
export async function processCommunication(
  communication: ProcessableCommunication,
): Promise<ProcessCommunicationResult> {
  try {
    const { analysis, model, promptVersion } = await analyzeCommunication(communication);
    const saved = await saveAnalysis(communication.id, analysis, model, promptVersion);

    logInfo("communication.analyzed", {
      communicationId: communication.id,
      model,
      promptVersion,
      category: analysis.category,
      intent: analysis.intent,
    });

    return { status: "success", analysis: saved };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logError("communication.analyze_failed", {
      communicationId: communication.id,
      error: message,
    });
    return { status: "error", error: message };
  }
}
