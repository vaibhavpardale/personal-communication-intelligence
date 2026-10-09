import { getSupabaseClient } from "@/lib/db/supabase-client";
import { toAnalysisInsertRow } from "@/lib/db/mappers";
import type { AnalysisResult } from "@/lib/validation/analysis-schema";
import type {
  Communication,
  CommunicationAnalysis,
  CommunicationWithAnalysis,
  NewCommunication,
  UserStatus,
} from "@/types/communication";
import type { AttentionDecision, CommunicationWithAttention } from "@/types/attention";

interface RawJoinRow extends Communication {
  communication_analysis: CommunicationAnalysis[] | CommunicationAnalysis | null;
}

function splitAnalysis(row: RawJoinRow): CommunicationWithAnalysis {
  const { communication_analysis, ...communication } = row;
  const analysis = Array.isArray(communication_analysis)
    ? (communication_analysis[0] ?? null)
    : (communication_analysis ?? null);
  return { ...communication, analysis };
}

interface RawAttentionJoinRow extends Communication {
  communication_analysis: CommunicationAnalysis[] | CommunicationAnalysis | null;
  attention_decisions: AttentionDecision[] | AttentionDecision | null;
}

function firstOrNull<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function splitAttention(row: RawAttentionJoinRow): CommunicationWithAttention {
  const { communication_analysis, attention_decisions, ...communication } = row;
  return {
    ...communication,
    analysis: firstOrNull(communication_analysis),
    attention: firstOrNull(attention_decisions),
  };
}

export async function listCommunicationsWithAnalysis(): Promise<CommunicationWithAnalysis[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("communications")
    .select("*, communication_analysis(*)")
    .order("received_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list communications: ${error.message}`);
  }

  return ((data ?? []) as RawJoinRow[]).map(splitAnalysis);
}

export async function getCommunicationWithAnalysis(
  id: string,
): Promise<CommunicationWithAnalysis | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("communications")
    .select("*, communication_analysis(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load communication ${id}: ${error.message}`);
  }
  if (!data) return null;

  return splitAnalysis(data as RawJoinRow);
}

export async function listCommunicationsWithAttention(): Promise<CommunicationWithAttention[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("communications")
    .select("*, communication_analysis(*), attention_decisions(*)")
    .order("received_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list communications with attention: ${error.message}`);
  }

  return ((data ?? []) as RawAttentionJoinRow[]).map(splitAttention);
}

export async function getCommunicationWithAttention(
  id: string,
): Promise<CommunicationWithAttention | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("communications")
    .select("*, communication_analysis(*), attention_decisions(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load communication ${id}: ${error.message}`);
  }
  if (!data) return null;

  return splitAttention(data as RawAttentionJoinRow);
}

/**
 * Inserts communications with an `external_id` (e.g. from Gmail), skipping
 * ones already imported (matched on `source` + `external_id`). Returns only
 * the newly-inserted rows, so the caller can run just those through the
 * pipeline on a re-sync.
 */
export async function upsertExternalCommunications(
  rows: (NewCommunication & { external_id: string })[],
): Promise<Communication[]> {
  if (rows.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("communications")
    .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true })
    .select("*");

  if (error) {
    throw new Error(`Failed to upsert external communications: ${error.message}`);
  }

  return (data ?? []) as Communication[];
}

export async function deleteCommunicationsBySource(source: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { error, count } = await supabase
    .from("communications")
    .delete({ count: "exact" })
    .eq("source", source);

  if (error) {
    throw new Error(`Failed to delete communications for source "${source}": ${error.message}`);
  }

  return count ?? 0;
}

export async function insertCommunications(
  rows: NewCommunication[],
): Promise<Communication[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("communications").insert(rows).select("*");

  if (error) {
    throw new Error(`Failed to insert communications: ${error.message}`);
  }

  return data as Communication[];
}

export async function countCommunications(): Promise<number> {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from("communications")
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`Failed to count communications: ${error.message}`);
  }

  return count ?? 0;
}

export async function saveAnalysis(
  communicationId: string,
  analysis: AnalysisResult,
  model: string,
  promptVersion: string,
): Promise<CommunicationAnalysis> {
  const supabase = getSupabaseClient();
  const row = toAnalysisInsertRow(communicationId, analysis, model, promptVersion);

  const { data, error } = await supabase
    .from("communication_analysis")
    .upsert(row, { onConflict: "communication_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save analysis for ${communicationId}: ${error.message}`);
  }

  return data as CommunicationAnalysis;
}

export async function setCommunicationStatus(id: string, status: UserStatus): Promise<void> {
  const { error } = await getSupabaseClient().from("communications").update({ user_status: status }).eq("id", id);
  if (error) throw new Error(`Failed to update communication ${id}: ${error.message}`);
}
