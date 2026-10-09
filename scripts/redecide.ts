import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { getSupabaseClient } from "../lib/db/supabase-client";
import { listPersonalContext } from "../lib/db/personal-context";
import { buildDecisionInput } from "../lib/decision-engine/build-input";
import { decideAttention } from "../lib/decision-engine/decide";

/**
 * Re-applies the current decision engine to every stored analysis — no OpenAI
 * calls. Existing explanation text is kept as-is (it was written for the old
 * level, so re-analyze a communication if you want a fresh explanation).
 */
async function main() {
  const supabase = getSupabaseClient();
  const context = await listPersonalContext();
  const { data: comms, error } = await supabase
    .from("communications")
    .select("*, communication_analysis(*), attention_decisions(level)");
  if (error) throw new Error(error.message);

  let changed = 0;
  let total = 0;
  for (const c of comms ?? []) {
    const analysis = Array.isArray(c.communication_analysis) ? c.communication_analysis[0] : c.communication_analysis;
    const previous = Array.isArray(c.attention_decisions) ? c.attention_decisions[0] : c.attention_decisions;
    if (!analysis) continue;
    total += 1;
    const d = decideAttention(buildDecisionInput(c, analysis), context);
    const { error: upErr } = await supabase
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
    if (upErr) throw new Error(upErr.message);
    if (previous && previous.level !== d.level) {
      changed += 1;
      console.log(`${c.subject}: ${previous.level} -> ${d.level}`);
    }
  }
  console.log(`Re-decided ${total} communications; ${changed} changed level.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
