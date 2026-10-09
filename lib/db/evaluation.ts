import { getSupabaseClient } from "@/lib/db/supabase-client";
import type { EvaluationExample } from "@/lib/evaluation/metrics";
import type { NewEvaluationDatasetEntry, EvaluationDatasetEntry, DatasetSplit, EvaluationDataset } from "@/types/evaluation";
import type { CommunicationCategory, CommunicationIntent } from "@/types/communication";
import type { AttentionLevel } from "@/lib/decision-engine/types";

export type EvaluationExampleRow = EvaluationExample & { subject: string; dataset_split: DatasetSplit; dataset: EvaluationDataset };

type OneOrMany<T> = T | T[] | null;

export interface RawEvaluationRow {
  communication_id: string;
  expected_category: CommunicationCategory | null;
  expected_intent: CommunicationIntent | null;
  expected_attention_level: AttentionLevel;
  dataset_split: DatasetSplit;
  dataset?: EvaluationDataset;
  communications: {
    subject: string;
    communication_analysis: OneOrMany<{ category: CommunicationCategory; intent: CommunicationIntent }>;
    attention_decisions: OneOrMany<{ level: AttentionLevel }>;
  } | null;
}

/** PostgREST embeds a to-one relationship (unique FK) as an object, but a
 * to-many relationship as an array — communication_analysis/attention_decisions
 * are unique per communication, so this normalizes either shape to one value. */
function firstOrNull<T>(value: OneOrMany<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function mapEvaluationRow(row: RawEvaluationRow): EvaluationExampleRow {
  const analysis = firstOrNull(row.communications?.communication_analysis ?? null);
  const attention = firstOrNull(row.communications?.attention_decisions ?? null);
  return {
    communication_id: row.communication_id,
    subject: row.communications?.subject ?? "(unknown)",
    expected_category: row.expected_category,
    expected_intent: row.expected_intent,
    expected_attention_level: row.expected_attention_level,
    dataset_split: row.dataset_split,
    dataset: row.dataset ?? "golden",
    actual_category: analysis?.category ?? null,
    actual_intent: analysis?.intent ?? null,
    actual_attention_level: attention?.level ?? null,
  };
}

export async function listEvaluationExamples(): Promise<EvaluationExampleRow[]> {
  const supabase = getSupabaseClient();
  const embed = `communications ( subject, communication_analysis(category,intent), attention_decisions(level) )`;
  const columns = "communication_id, expected_category, expected_intent, expected_attention_level, dataset_split";

  let { data, error } = await supabase.from("evaluation_dataset").select(`${columns}, dataset, ${embed}`);

  // Migration 0005 (the `dataset` column) may not be applied yet; treat every row as golden then.
  if (error && /dataset/.test(error.message) && !/dataset_split/.test(error.message)) {
    ({ data, error } = await supabase.from("evaluation_dataset").select(`${columns}, ${embed}`));
  }

  if (error) {
    throw new Error(`Failed to list evaluation dataset: ${error.message}`);
  }

  return ((data ?? []) as unknown as RawEvaluationRow[]).map(mapEvaluationRow);
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

export async function getGmailLabel(communicationId: string): Promise<AttentionLevel | null> {
  const { data, error } = await getSupabaseClient()
    .from("evaluation_dataset")
    .select("expected_attention_level")
    .eq("communication_id", communicationId)
    .eq("dataset", "gmail")
    .maybeSingle();
  if (error) throw new Error(`Failed to read label: ${error.message}`);
  return (data?.expected_attention_level as AttentionLevel | undefined) ?? null;
}

/** Records the human-decided correct level for a real-inbox message (attention level only). */
export async function saveGmailLabel(communicationId: string, level: AttentionLevel): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("evaluation_dataset")
    .upsert(
      {
        communication_id: communicationId,
        expected_category: null,
        expected_intent: null,
        expected_attention_level: level,
        dataset_split: "dev",
        dataset: "gmail",
      },
      { onConflict: "communication_id" },
    );
  if (error) throw new Error(`Failed to save label: ${error.message}`);
}

export async function clearGmailLabel(communicationId: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("evaluation_dataset")
    .delete()
    .eq("communication_id", communicationId)
    .eq("dataset", "gmail");
  if (error) throw new Error(`Failed to remove label: ${error.message}`);
}
