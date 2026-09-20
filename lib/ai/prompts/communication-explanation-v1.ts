export const EXPLANATION_PROMPT_VERSION = "communication-explanation-v1";

export const EXPLANATION_SYSTEM_PROMPT =
  "You explain, in plain language, why a communication was assigned a given attention level. " +
  "You may use ONLY the facts listed in the prompt. Never invent information, amounts, dates, " +
  "or names that are not explicitly given to you.";

export interface ExplanationPromptInput {
  subject: string;
  summary: string;
  category: string;
  intent: string;
  organization: string | null;
  deadline: string | null;
  eventDate: string | null;
  amount: number | null;
  currency: string | null;
  requestedAction: string | null;
  attentionLevel: string;
  decisionReason: string;
  matchedContext: string[];
}

export function buildExplanationPrompt(input: ExplanationPromptInput): string {
  return `Using ONLY the facts below, explain this decision to the user.

Facts:
- Subject: ${input.subject}
- Summary: ${input.summary}
- Category: ${input.category}
- Intent: ${input.intent}
- Organization: ${input.organization ?? "unknown"}
- Deadline: ${input.deadline ?? "none"}
- Event date: ${input.eventDate ?? "none"}
- Amount: ${input.amount != null ? `${input.amount} ${input.currency ?? ""}`.trim() : "none"}
- Requested action (as extracted): ${input.requestedAction ?? "none"}
- Attention level assigned by the system: ${input.attentionLevel}
- System's reason for that level: ${input.decisionReason}
- Personal context that was matched: ${input.matchedContext.length > 0 ? input.matchedContext.join("; ") : "none"}

Write:
1. "why_it_matters": one or two factual sentences explaining why this does (or does not) deserve
   the user's attention, grounded only in the facts above.
2. "what_you_can_do": one short, concrete, actionable sentence. If the attention level is
   NO_ACTION or LOW_PRIORITY and there is no requested action, say plainly that no action is
   needed rather than inventing one.

Synthesize the facts into plain language; do not just restate them verbatim, and do not add any
fact that is not listed above.`;
}
