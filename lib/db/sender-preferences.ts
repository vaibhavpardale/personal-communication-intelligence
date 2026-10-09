import { getSupabaseClient } from "@/lib/db/supabase-client";
import { senderAddress, type SenderPreference, type SenderPreferenceMap } from "@/lib/decision-engine/preferences";

/** Postgres "undefined table" / PostgREST "not in schema cache": the migration has not been applied yet. */
const isMissingTable = (error: { code?: string; message?: string }) =>
  error.code === "42P01" || error.code === "PGRST205" || /sender_preferences/.test(error.message ?? "");

/** Empty (not an error) until migration 0007 is applied, so the rest of the app keeps working. */
export async function listSenderPreferences(): Promise<SenderPreferenceMap> {
  const { data, error } = await getSupabaseClient().from("sender_preferences").select("sender, preference");
  if (error) {
    if (isMissingTable(error)) return {};
    throw new Error(`Failed to list sender preferences: ${error.message}`);
  }
  return Object.fromEntries((data ?? []).map((r) => [r.sender as string, r.preference as SenderPreference]));
}

/** Sets a preference, or clears it when `preference` is null. */
export async function setSenderPreference(sender: string, preference: SenderPreference | null): Promise<void> {
  const address = senderAddress(sender);
  const supabase = getSupabaseClient();
  const { error } = preference
    ? await supabase.from("sender_preferences").upsert({ sender: address, preference }, { onConflict: "sender" })
    : await supabase.from("sender_preferences").delete().eq("sender", address);
  if (error) {
    throw new Error(
      isMissingTable(error)
        ? "Sender preferences need migration 0007 (supabase/migrations/0007_sender_preferences.sql). Run it in the Supabase SQL editor."
        : `Failed to save preference: ${error.message}`,
    );
  }
}
