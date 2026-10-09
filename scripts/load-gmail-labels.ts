import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { readFileSync } from "fs";
import { getSupabaseClient } from "../lib/db/supabase-client";
import { ATTENTION_LEVELS } from "../lib/decision-engine/types";

/**
 * Loads hand-reviewed attention-level labels for real Gmail messages into the
 * evaluation dataset (dataset = 'gmail'). Requires migration 0005.
 *
 * Usage: npx tsx scripts/load-gmail-labels.ts <labels.json>
 * where labels.json is [{ "communication_id": "<uuid>", "label": "REVIEW" }, ...].
 * Keep that file out of the repo: it identifies real emails.
 */
async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npx tsx scripts/load-gmail-labels.ts <labels.json>");
    process.exit(1);
  }

  const labels = JSON.parse(readFileSync(path, "utf8")) as { communication_id: string; label: string }[];
  const invalid = labels.filter((l) => !(ATTENTION_LEVELS as readonly string[]).includes(l.label));
  if (invalid.length > 0) {
    console.error(`Invalid labels: ${JSON.stringify(invalid)}`);
    process.exit(1);
  }

  const rows = labels.map((l) => ({
    communication_id: l.communication_id,
    expected_category: null,
    expected_intent: null,
    expected_attention_level: l.label,
    // Real-inbox labels start in 'dev'; freeze a held-out subset as 'test' later.
    dataset_split: "dev",
    dataset: "gmail",
  }));

  const { error } = await getSupabaseClient()
    .from("evaluation_dataset")
    .upsert(rows, { onConflict: "communication_id" });
  if (error) {
    console.error(`Failed to load labels: ${error.message}`);
    process.exit(1);
  }
  console.log(`Loaded ${rows.length} Gmail labels into evaluation_dataset.`);
}

main();
