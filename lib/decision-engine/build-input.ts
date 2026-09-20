import type { Communication, CommunicationAnalysis } from "@/types/communication";
import type { DecisionEngineInput } from "@/lib/decision-engine/types";

export function buildDecisionInput(
  communication: Pick<Communication, "sender" | "sender_name">,
  analysis: Pick<
    CommunicationAnalysis,
    | "category"
    | "intent"
    | "organization"
    | "people"
    | "entities"
    | "product_service"
    | "deadline"
    | "event_date"
    | "amount"
    | "requested_action"
  >,
): DecisionEngineInput {
  return {
    category: analysis.category,
    intent: analysis.intent,
    organization: analysis.organization,
    people: analysis.people,
    entities: analysis.entities,
    product_service: analysis.product_service,
    deadline: analysis.deadline,
    event_date: analysis.event_date,
    amount: analysis.amount,
    requested_action: analysis.requested_action,
    sender: communication.sender,
    sender_name: communication.sender_name,
  };
}
