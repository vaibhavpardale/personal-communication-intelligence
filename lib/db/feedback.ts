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

/** All feedback, grouped by communication, for learning which senders the user cares about. */
export async function listFeedbackByCommunication(): Promise<Map<string, UserFeedback["feedback_type"][]>> {
  const { data, error } = await getSupabaseClient().from("user_feedback").select("communication_id, feedback_type");
  if (error) throw new Error(`Failed to list feedback: ${error.message}`);
  const map = new Map<string, UserFeedback["feedback_type"][]>();
  for (const row of data ?? []) {
    map.set(row.communication_id, [...(map.get(row.communication_id) ?? []), row.feedback_type]);
  }
  return map;
}
