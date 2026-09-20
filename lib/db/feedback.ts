import { getSupabaseClient } from "@/lib/db/supabase-client";
import type { NewUserFeedback, UserFeedback } from "@/types/feedback";

export async function saveFeedback(entry: NewUserFeedback): Promise<UserFeedback> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_feedback")
    .insert(entry)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save feedback: ${error.message}`);
  }

  return data as UserFeedback;
}

export async function listFeedbackForCommunication(
  communicationId: string,
): Promise<UserFeedback[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_feedback")
    .select("*")
    .eq("communication_id", communicationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list feedback for ${communicationId}: ${error.message}`);
  }

  return (data ?? []) as UserFeedback[];
}
