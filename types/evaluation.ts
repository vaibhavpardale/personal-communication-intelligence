import type { CommunicationCategory, CommunicationIntent } from "@/types/communication";
import type { AttentionLevel } from "@/lib/decision-engine/types";

export type DatasetSplit = "dev" | "test";

/** A single frozen, human-labeled ground-truth row (see scripts/golden-labels.ts). */
export interface EvaluationDatasetEntry {
  id: string;
  communication_id: string;
  expected_category: CommunicationCategory;
  expected_intent: CommunicationIntent;
  expected_attention_level: AttentionLevel;
  dataset_split: DatasetSplit;
  created_at: string;
}

export type NewEvaluationDatasetEntry = Omit<EvaluationDatasetEntry, "id" | "created_at">;
