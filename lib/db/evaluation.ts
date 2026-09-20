import { getSupabaseClient } from "@/lib/db/supabase-client";
import type { EvaluationExample } from "@/lib/evaluation/metrics";
import type { NewEvaluationDatasetEntry, EvaluationDatasetEntry, DatasetSplit } from "@/types/evaluation";
import type { CommunicationCategory, CommunicationIntent } from "@/types/communication";
import type { AttentionLevel } from "@/lib/decision-engine/types";

export type EvaluationExampleRow = EvaluationExample & { subject: string; dataset_split: DatasetSplit };

interface RawEvaluationRow {
  communication_id: string;
  expected_category: CommunicationCategory;
  expected_intent: CommunicationIntent;
  expected_attention_level: AttentionLevel;
  dataset_split: DatasetSplit;
  communications: {
    subject: string;
    communication_analysis: { category: CommunicationCategory; intent: CommunicationIntent }[] | null;
    attention_decisions: { level: AttentionLevel }[] | null;
  } | null;
}

export async function listEvaluationExamples(): Promise<EvaluationExampleRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("evaluation_dataset").select(
    `communication_id, expected_category, expected_intent, expected_attention_level, dataset_split,
     communications ( subject, communication_analysis(category,intent), attention_decisions(level) )`,
  );

  if (error) {
    throw new Error(`Failed to list evaluation dataset: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawEvaluationRow[]).map((row) => {
    const analysis = row.communications?.communication_analysis?.[0] ?? null;
    const attention = row.communications?.attention_decisions?.[0] ?? null;
    return {
      communication_id: row.communication_id,
      subject: row.communications?.subject ?? "(unknown)",
      expected_category: row.expected_category,
      expected_intent: row.expected_intent,
      expected_attention_level: row.expected_attention_level,
      dataset_split: row.dataset_split,
      actual_category: analysis?.category ?? null,
      actual_intent: analysis?.intent ?? null,
      actual_attention_level: attention?.level ?? null,
    };
  });
}

export async function insertEvaluationDataset(
  rows: NewEvaluationDatasetEntry[],
): Promise<EvaluationDatasetEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("evaluation_dataset")
    .upsert(rows, { onConflict: "communication_id" })
    .select("*");

  if (error) {
    throw new Error(`Failed to insert evaluation dataset: ${error.message}`);
  }

  return data as EvaluationDatasetEntry[];
}
