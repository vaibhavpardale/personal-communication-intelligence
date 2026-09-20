import { getSupabaseClient } from "@/lib/db/supabase-client";
import type { GmailConnection, NewGmailConnection } from "@/types/gmail";

export async function saveGmailConnection(entry: NewGmailConnection): Promise<GmailConnection> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("gmail_connections")
    .upsert(entry, { onConflict: "email" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save Gmail connection: ${error.message}`);
  }

  return data as GmailConnection;
}

/** This is a personal, single-user app: there is at most one meaningful connection. */
export async function getActiveGmailConnection(): Promise<GmailConnection | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("gmail_connections")
    .select("*")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Gmail connection: ${error.message}`);
  }

  return (data as GmailConnection | null) ?? null;
}

export async function updateGmailAccessToken(
  id: string,
  accessToken: string,
  expiresAt: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("gmail_connections")
    .update({
      access_token: accessToken,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update Gmail access token: ${error.message}`);
  }
}

export async function deleteGmailConnection(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("gmail_connections").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to disconnect Gmail: ${error.message}`);
  }
}
