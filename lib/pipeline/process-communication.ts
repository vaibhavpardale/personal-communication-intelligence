import { analyzeCommunication } from "@/lib/ai/analyze-communication";
import { generateExplanation } from "@/lib/ai/generate-explanation";
import { saveAnalysis } from "@/lib/db/communications";
import { saveAttentionDecision, type DecisionExplanation } from "@/lib/db/attention";
import { buildDecisionInput } from "@/lib/decision-engine/build-input";
import { decideWithPreferences, type SenderPreferenceMap } from "@/lib/decision-engine/preferences";
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
 * (with personal context) the deterministic decision engine -> grounded LLM
 * explanation of that decision -> persistence. If explanation generation
 * fails, the decision is still saved (without explanation text) — the
 * attention level must never depend on the explanation succeeding.
 * Failures elsewhere are caught and reported per-item so a batch run
 * (analyze-all) never fails as a whole because of a single bad response.
 */
export async function processCommunication(
  communication: ProcessableCommunication,
  personalContext: PersonalContextEntry[] = [],
  senderPreferences: SenderPreferenceMap = {},
): Promise<ProcessCommunicationResult> {
  try {
    const { analysis, model, promptVersion } = await analyzeCommunication(communication);
    const savedAnalysis = await saveAnalysis(communication.id, analysis, model, promptVersion);

    const decision = decideWithPreferences(
      buildDecisionInput(communication, savedAnalysis),
      personalContext,
      senderPreferences,
    );

    let explanation: DecisionExplanation | null = null;
    try {
      const generated = await generateExplanation({
        subject: communication.subject,
        summary: savedAnalysis.summary,
        category: savedAnalysis.category,
        intent: savedAnalysis.intent,
        organization: savedAnalysis.organization,
        deadline: savedAnalysis.deadline,
        eventDate: savedAnalysis.event_date,
        amount: savedAnalysis.amount,
        currency: savedAnalysis.currency,
        requestedAction: savedAnalysis.requested_action,
        attentionLevel: decision.level,
        decisionReason: decision.reason,
        matchedContext: decision.matchedContext.map(
          (m) => `${m.key} (${m.context_type}, importance ${m.importance}/5)`,
        ),
      });
      explanation = {
        why_it_matters: generated.explanation.why_it_matters,
        what_you_can_do: generated.explanation.what_you_can_do,
        model: generated.model,
        promptVersion: generated.promptVersion,
      };
    } catch (explanationError) {
      logError("communication.explanation_failed", {
        communicationId: communication.id,
        error: explanationError instanceof Error ? explanationError.message : "Unknown error",
      });
    }

    const savedAttention = await saveAttentionDecision(communication.id, decision, explanation);

    logInfo("communication.processed", {
      communicationId: communication.id,
      model,
      promptVersion,
      category: analysis.category,
      intent: analysis.intent,
      attentionLevel: decision.level,
      decisionVersion: decision.decisionVersion,
      explained: explanation !== null,
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
