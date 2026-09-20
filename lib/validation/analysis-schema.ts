import { z } from "zod";
import { CATEGORIES, INTENTS } from "@/types/communication";

/**
 * Schema for the structured facts the LLM extracts from a single
 * communication. Nothing in here is a decision (attention, priority, etc.)
 * — that belongs to the deterministic decision engine (Phase 2).
 */
export const analysisResultSchema = z.object({
  category: z.enum(CATEGORIES),
  intent: z.enum(INTENTS),
  organization: z.string().nullable(),
  people: z.array(z.string()).nullable(),
  entities: z.array(z.string()).nullable(),
  event_date: z.string().nullable(),
  deadline: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  product_service: z.string().nullable(),
  reference_id: z.string().nullable(),
  requested_action: z.string().nullable(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
