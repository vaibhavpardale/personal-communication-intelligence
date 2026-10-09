import { listPersonalContext } from "@/lib/db/personal-context";
import { getSupabaseClient } from "@/lib/db/supabase-client";
import { listSenderPreferences } from "@/lib/db/sender-preferences";
import { buildDecisionInput } from "@/lib/decision-engine/build-input";
import { decideWithPreferences, senderAddress } from "@/lib/decision-engine/preferences";

/**
 * Re-applies the current decision rules, personal context and sender preferences to stored
 * analyses. No AI calls; existing explanation text is kept. Pass `sender` to limit it to one address.
 */
export async function redecide(options: { sender?: string } = {}): Promise<{ total: number; changed: number }> {
  const supabase = getSupabaseClient();
  const [context, preferences] = await Promise.all([listPersonalContext(), listSenderPreferences()]);
  const wanted = options.sender ? senderAddress(options.sender) : null;

  const { data, error } = await supabase
    .from("communications")
    .select("*, communication_analysis(*), attention_decisions(level)");
  if (error) throw new Error(`Failed to load communications: ${error.message}`);

  let total = 0;
  let changed = 0;
  for (const c of data ?? []) {
    if (wanted && senderAddress(c.sender) !== wanted) continue;
    const analysis = Array.isArray(c.communication_analysis) ? c.communication_analysis[0] : c.communication_analysis;
    const previous = Array.isArray(c.attention_decisions) ? c.attention_decisions[0] : c.attention_decisions;
    if (!analysis) continue;
    total += 1;

    const d = decideWithPreferences(buildDecisionInput(c, analysis), context, preferences);
    const { error: updateError } = await supabase
      .from("attention_decisions")
      .update({
        level: d.level,
        scores: d.scores,
        overall_score: d.overallScore,
        reason: d.reason,
        matched_context: d.matchedContext,
        decision_version: d.decisionVersion,
      })
      .eq("communication_id", c.id);
    if (updateError) throw new Error(`Failed to update decision for ${c.id}: ${updateError.message}`);
    if (previous && previous.level !== d.level) changed += 1;
  }
  return { total, changed };
}
