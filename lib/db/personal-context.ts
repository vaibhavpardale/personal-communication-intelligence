import { getSupabaseClient } from "@/lib/db/supabase-client";
import type { NewPersonalContextEntry, PersonalContextEntry } from "@/lib/context/types";

export async function listPersonalContext(): Promise<PersonalContextEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("personal_context").select("*");

  if (error) {
    throw new Error(`Failed to list personal context: ${error.message}`);
  }

  return (data ?? []) as PersonalContextEntry[];
}

export async function insertPersonalContext(
  rows: NewPersonalContextEntry[],
): Promise<PersonalContextEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("personal_context")
    .upsert(rows, { onConflict: "context_type,key" })
    .select("*");

  if (error) {
    throw new Error(`Failed to insert personal context: ${error.message}`);
  }

  return data as PersonalContextEntry[];
}
