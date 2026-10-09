import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { getSupabaseClient } from "../lib/db/supabase-client";
import { redecide } from "../lib/pipeline/redecide";

/**
 * Puts the app back to a clean starting state for a demo take:
 *   - every message marked Done / Hidden / Snoozed becomes unread again
 *   - VIP and muted senders are cleared, and those senders' mail is re-rated
 * No emails, analyses or evaluation labels are deleted.
 *
 *   npm run demo:reset            shows what it would change
 *   npm run demo:reset -- --yes   does it
 */
async function main() {
  const apply = process.argv.includes("--yes");
  const supabase = getSupabaseClient();

  const { count: handled } = await supabase
    .from("communications")
    .select("*", { count: "exact", head: true })
    .neq("user_status", "unread");
  const prefs = await supabase.from("sender_preferences").select("sender", { count: "exact", head: true });
  const prefCount = prefs.error ? 0 : (prefs.count ?? 0);

  console.log(`Would restore ${handled ?? 0} handled message(s) to unread and clear ${prefCount} sender preference(s).`);
  if (!apply) {
    console.log("Dry run. Add --yes to apply.");
    return;
  }

  const { error } = await supabase.from("communications").update({ user_status: "unread" }).neq("user_status", "unread");
  if (error) throw new Error(`Could not restore messages: ${error.message}`);
  if (prefCount > 0) {
    const del = await supabase.from("sender_preferences").delete().neq("sender", "");
    if (del.error) throw new Error(`Could not clear sender preferences: ${del.error.message}`);
    const { total, changed } = await redecide();
    console.log(`Re-rated ${total} messages (${changed} changed level).`);
  }
  console.log("Done. The app is back to a clean start.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
