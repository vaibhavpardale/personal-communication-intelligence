import { getSupabaseClient } from "@/lib/db/supabase-client";
import { toAnalysisInsertRow } from "@/lib/db/mappers";
import type { AnalysisResult } from "@/lib/validation/analysis-schema";
import type {
  Communication,
  CommunicationAnalysis,
  CommunicationWithAnalysis,
  NewCommunication,
} from "@/types/communication";

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
