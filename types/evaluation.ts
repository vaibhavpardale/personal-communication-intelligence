import type { CommunicationCategory, CommunicationIntent } from "@/types/communication";
import type { AttentionLevel } from "@/lib/decision-engine/types";

export type DatasetSplit = "dev" | "test";

/** "golden": frozen synthetic samples. "gmail": hand-reviewed labels on real inbox mail. */
export type EvaluationDataset = "golden" | "gmail";

/** A single frozen, human-labeled ground-truth row (see scripts/golden-labels.ts). */
export interface EvaluationDatasetEntry {
  id: string;
  communication_id: string;
  /** null for real-inbox rows, which are labeled on attention level only. */
  expected_category: CommunicationCategory | null;
  expected_intent: CommunicationIntent | null;
  expected_attention_level: AttentionLevel;
  dataset_split: DatasetSplit;
  dataset: EvaluationDataset;
  created_at: string;
}

export type NewEvaluationDatasetEntry = Omit<EvaluationDatasetEntry, "id" | "created_at" | "dataset"> & { dataset?: EvaluationDataset };
