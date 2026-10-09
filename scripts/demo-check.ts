import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { getSupabaseClient } from "../lib/db/supabase-client";
import { getActiveGmailConnection } from "../lib/db/gmail-connection";
import { getValidAccessToken } from "../lib/gmail/client";

/**
 * Read-only readiness check before recording a demo. Changes nothing.
 *   npm run demo:check            (app expected on http://localhost:3005)
 *   APP_URL=http://localhost:3000 npm run demo:check
 */
const APP_URL = process.env.APP_URL ?? "http://localhost:3005";
type Status = "ok" | "warn" | "fail";
const ICON: Record<Status, string> = { ok: "✓", warn: "!", fail: "✗" };
const results: { status: Status; label: string; hint?: string }[] = [];
/** Report "ok" with `label` when `pass`, otherwise `status` with `failLabel` (and a hint). */
const expect = (pass: boolean, label: string, status: Status, failLabel: string, hint?: string) =>
  pass ? report("ok", label) : report(status, failLabel, hint);
const report = (status: Status, label: string, hint?: string) => {
  results.push({ status, label, hint });
  console.log(`  ${ICON[status]} ${label}${hint ? `\n      → ${hint}` : ""}`);
};

async function table(name: string, column = "*") {
  const { error } = await getSupabaseClient().from(name).select(column, { head: true, count: "exact" }).limit(1);
  return error?.message ?? null;
}

async function main() {
  console.log("\nEnvironment");
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"]) {
    expect(Boolean(process.env[key]), key, "fail", `${key} is missing`, "set it in .env.local");
  }
  for (const key of ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REDIRECT_URI"]) {
    expect(Boolean(process.env[key]), key, "warn", `${key} is missing`, "only needed to show the live Gmail sync");
  }

  const supabase = getSupabaseClient();
  console.log("\nDatabase");
  const reach = await table("communications");
  if (reach) {
    report("fail", "Supabase is not reachable", `${reach}. Check the project is not paused.`);
    return;
  }
  report("ok", "Supabase reachable");
  const migrations: [string, string, string, string][] = [
    ["communications", "user_status", "0006_user_status.sql", "Done / Hide / Snooze"],
    ["evaluation_dataset", "dataset", "0005_gmail_eval_labels.sql", "real-Gmail evaluation section"],
    ["sender_preferences", "sender", "0007_sender_preferences.sql", "VIP and Mute"],
  ];
  for (const [t, col, file, feature] of migrations) {
    const err = await table(t, col);
    expect(!err, `${feature} ready`, "fail", `${feature} is not ready`, `run supabase/migrations/${file} in the Supabase SQL editor`);
  }

  console.log("\nSample data (what is safe to show on screen)");
  const { data: samples } = await supabase
    .from("communications")
    .select("id, user_status, communication_analysis(id), attention_decisions(level)")
    .eq("source", "sample");
  const rows = samples ?? [];
  const level = (r: (typeof rows)[number]) => {
    const d = r.attention_decisions as { level: string }[] | { level: string } | null;
    return Array.isArray(d) ? d[0]?.level : d?.level;
  };
  expect(rows.length >= 44, `${rows.length} sample emails`, "fail", `only ${rows.length} of 44 sample emails`, "npm run seed, then Analyze All");
  const unanalyzed = rows.filter((r) => !level(r)).length;
  expect(unanalyzed === 0, "all samples analyzed", "fail", `${unanalyzed} samples not analyzed`, "open the app and click Analyze All");
  const actNow = rows.filter((r) => level(r) === "ACT_NOW" && r.user_status === "unread").length;
  expect(actNow >= 3, `${actNow} unread Act Now samples for the demo list`, "warn", `only ${actNow} unread Act Now samples`, "npm run demo:reset -- --yes brings handled items back");
  const handled = rows.filter((r) => r.user_status !== "unread").length;
  expect(handled === 0, "no samples marked Done / Hidden / Snoozed", "warn", `${handled} samples are marked Done, Hidden or Snoozed`, "npm run demo:reset -- --yes");

  console.log("\nGmail (only needed for the live sync)");
  const connection = await getActiveGmailConnection().catch(() => null);
  if (!connection) {
    report("warn", "Gmail is not connected", "Settings → Connect Gmail");
  } else {
    try {
      await getValidAccessToken(connection);
      report("ok", `Gmail connected as ${connection.email}, token valid`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report("fail", "Gmail authorization expired", message.includes("invalid_grant") ? "Settings → Reconnect Gmail (tokens last 7 days in Testing mode)" : message);
    }
    const { data: newest } = await supabase.from("communications").select("received_at").eq("source", "gmail").order("received_at", { ascending: false }).limit(1).maybeSingle();
    if (!newest) report("warn", "no Gmail mail imported yet", "sync before recording");
    else {
      const ageDays = (Date.now() - new Date(newest.received_at).getTime()) / 86_400_000;
      expect(ageDays <= 2, "Gmail mail is recent", "warn", `newest Gmail message is ${Math.round(ageDays)} days old`, "sync 'Since last sync' just before recording");
    }
    report("warn", "real emails exist in this database", "turn Sample data ON, or only show screens that list sample mail");
  }

  console.log(`\nRunning app (${APP_URL})`);
  try {
    const home = await fetch(APP_URL, { cache: "no-store" });
    if (!home.ok) throw new Error(`HTTP ${home.status}`);
    report("ok", "app is up");
    const html = await home.text();
    expect(!html.includes("[project]/"), "production build, no development badge", "warn", "running in development mode (a black N badge shows in the corner)", "stop it and run npm run demo for a clean recording");
    for (const path of ["/brief", "/api/notifications", "/manifest.webmanifest"]) {
      const res = await fetch(`${APP_URL}${path}`, { cache: "no-store" });
      expect(res.ok, `${path} responds`, "fail", `${path} returned HTTP ${res.status}`);
    }
  } catch (error) {
    report("fail", `app is not reachable at ${APP_URL}`, `${error instanceof Error ? error.message : error}. Start it with npm run demo`);
  }
}

main()
  .catch((error) => report("fail", `check crashed: ${error instanceof Error ? error.message : error}`))
  .finally(() => {
    const fails = results.filter((r) => r.status === "fail").length;
    const warns = results.filter((r) => r.status === "warn").length;
    console.log(`\n${fails === 0 ? "Ready to record" : "Not ready"}: ${fails} to fix, ${warns} to review.\n`);
    process.exit(fails === 0 ? 0 : 1);
  });
