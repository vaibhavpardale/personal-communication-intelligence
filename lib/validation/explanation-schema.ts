import { z } from "zod";

/** The LLM's grounded explanation of an already-made attention decision. */
export const explanationResultSchema = z.object({
  why_it_matters: z.string(),
  what_you_can_do: z.string(),
});

export type ExplanationResult = z.infer<typeof explanationResultSchema>;
