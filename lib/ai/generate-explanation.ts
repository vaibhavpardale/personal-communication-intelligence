import { zodResponseFormat } from "openai/helpers/zod";
import { config } from "@/lib/config";
import { getOpenAiClient } from "@/lib/ai/openai-client";
import {
  buildExplanationPrompt,
  EXPLANATION_PROMPT_VERSION,
  EXPLANATION_SYSTEM_PROMPT,
  type ExplanationPromptInput,
} from "@/lib/ai/prompts/communication-explanation-v1";
import { explanationResultSchema, type ExplanationResult } from "@/lib/validation/explanation-schema";

export interface GenerateExplanationResult {
  explanation: ExplanationResult;
  model: string;
  promptVersion: string;
}

/**
 * Generates a grounded, plain-language explanation for an *already-made*
 * attention decision. This never influences the decision itself — it runs
 * strictly after the deterministic decision engine.
 */
export async function generateExplanation(
  input: ExplanationPromptInput,
): Promise<GenerateExplanationResult> {
  const client = getOpenAiClient();

  const completion = await client.chat.completions.parse({
    model: config.openai.model,
    temperature: 0,
    messages: [
      { role: "system", content: EXPLANATION_SYSTEM_PROMPT },
      { role: "user", content: buildExplanationPrompt(input) },
    ],
    response_format: zodResponseFormat(explanationResultSchema, "communication_explanation"),
  });

  const choice = completion.choices[0];

  if (choice?.message.refusal) {
    throw new Error(`AI refused to generate explanation: ${choice.message.refusal}`);
  }

  const parsed = choice?.message.parsed;

  if (!parsed) {
    throw new Error("AI explanation response did not match the expected schema");
  }

  return {
    explanation: parsed,
    model: completion.model,
    promptVersion: EXPLANATION_PROMPT_VERSION,
  };
}
