import { zodResponseFormat } from "openai/helpers/zod";
import { config } from "@/lib/config";
import { getOpenAiClient } from "@/lib/ai/openai-client";
import {
  buildAnalysisPrompt,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
} from "@/lib/ai/prompts/communication-analysis-v1";
import { analysisResultSchema, type AnalysisResult } from "@/lib/validation/analysis-schema";

export interface AnalyzeCommunicationInput {
  sender: string;
  sender_name: string | null;
  subject: string;
  content: string;
  received_at: string;
}

export interface AnalyzeCommunicationResult {
  analysis: AnalysisResult;
  model: string;
  promptVersion: string;
}

/**
 * LLM understands, application decides: this function only produces
 * structured, schema-validated facts about a communication. It makes no
 * attention/priority decision.
 */
export async function analyzeCommunication(
  input: AnalyzeCommunicationInput,
): Promise<AnalyzeCommunicationResult> {
  const client = getOpenAiClient();

  const completion = await client.chat.completions.parse({
    model: config.openai.model,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildAnalysisPrompt({
          sender: input.sender,
          senderName: input.sender_name,
          subject: input.subject,
          content: input.content,
          receivedAt: input.received_at,
        }),
      },
    ],
    response_format: zodResponseFormat(analysisResultSchema, "communication_analysis"),
  });

  const choice = completion.choices[0];

  if (choice?.message.refusal) {
    throw new Error(`AI refused to analyze communication: ${choice.message.refusal}`);
  }

  const parsed = choice?.message.parsed;

  if (!parsed) {
    throw new Error("AI response did not match the expected schema");
  }

  return {
    analysis: parsed,
    model: completion.model,
    promptVersion: PROMPT_VERSION,
  };
}
