export const PROMPT_VERSION = "communication-analysis-v1";

export interface AnalysisPromptInput {
  sender: string;
  senderName: string | null;
  subject: string;
  content: string;
  receivedAt: string;
}

export const SYSTEM_PROMPT =
  "You extract structured facts from a single personal digital communication (email). " +
  "You never invent information that is not present in the text. " +
  "If a field cannot be determined from the text, you return null for it.";

export function buildAnalysisPrompt(input: AnalysisPromptInput): string {
  return `Analyze the following communication and extract structured facts about it.

Rules:
- Never invent information. Only use what is stated or clearly implied in the text.
- Use null for any field that cannot be determined.
- Dates (event_date, deadline) must be ISO 8601 ("YYYY-MM-DD") when determinable, otherwise null.
- "amount" is a plain number with no currency symbol or thousands separators; "currency" is its ISO 4217 code (e.g. "USD", "INR") when known.
- "people" and "entities" are short arrays of plain strings; use an empty consideration (null) if none are present.
- "entities" holds other important named entities not already captured (e.g. flight numbers, order numbers, locations, product names) that are not the sender's organization.
- "summary" is one or two factual sentences describing what the communication is about.
- "confidence" is your calibrated confidence (0 to 1) in the overall analysis.

Communication:
Sender: ${input.sender}${input.senderName ? ` (${input.senderName})` : ""}
Received: ${input.receivedAt}
Subject: ${input.subject}
Content:
"""
${input.content}
"""
`;
}
