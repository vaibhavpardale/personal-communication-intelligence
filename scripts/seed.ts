import { config as loadEnv } from "dotenv";

// Match Next.js's own convention: .env.local holds real local secrets and
// takes precedence over .env (which is typically just committed defaults).
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { getSupabaseClient } from "../lib/db/supabase-client";
import { isSupabaseConfigured } from "../lib/config";
import { sampleCommunications } from "./sample-communications";
import { samplePersonalContext } from "./sample-personal-context";
import { goldenLabels } from "./golden-labels";

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

async function seedCommunications(
  supabase: SupabaseClient,
): Promise<{ id: string; subject: string }[]> {
  const { data: existing, error: existingError } = await supabase
    .from("communications")
    .select("id, subject")
    .eq("source", "sample");

  if (existingError) {
    console.error(`Failed to load existing sample communications: ${existingError.message}`);
    process.exit(1);
  }

  // Insert only the samples that are missing, so a partial deletion is repaired
  // instead of being skipped (and re-running never creates duplicates).
  const have = new Set((existing ?? []).map((row) => row.subject));
  const missing = sampleCommunications.filter((c) => !have.has(c.subject));

  if (missing.length === 0) {
    console.log(
      `All ${existing?.length ?? 0} sample communications already exist; skipping insert (will still ` +
        `seed/update personal context and the evaluation dataset).`,
    );
    return existing ?? [];
  }

  const { data, error } = await supabase.from("communications").insert(missing).select("id, subject");

  if (error) {
    console.error(`Failed to seed communications: ${error.message}`);
    process.exit(1);
  }

  console.log(`Seeded ${data?.length ?? 0} missing sample communication(s).`);
  return [...(existing ?? []), ...(data ?? [])];
}

async function seedPersonalContext(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("personal_context")
    .upsert(samplePersonalContext, { onConflict: "context_type,key" })
    .select("id");

  if (error) {
    console.error(`Failed to seed personal context: ${error.message}`);
    process.exit(1);
  }

  console.log(`Seeded/updated ${data?.length ?? 0} personal context entries.`);
}

async function seedEvaluationDataset(
  supabase: SupabaseClient,
  communications: { id: string; subject: string }[],
) {
  const bySubject = new Map(communications.map((c) => [c.subject, c.id]));

  const rows = goldenLabels
    .map((label) => {
      const communicationId = bySubject.get(label.subject);
      if (!communicationId) return null;
      return {
        communication_id: communicationId,
        expected_category: label.expected_category,
        expected_intent: label.expected_intent,
        expected_attention_level: label.expected_attention_level,
        dataset_split: label.dataset_split,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length < goldenLabels.length) {
    console.warn(
      `Only matched ${rows.length}/${goldenLabels.length} golden labels to seeded ` +
        `communications by subject.`,
    );
  }

  const { data, error } = await supabase
    .from("evaluation_dataset")
    .upsert(rows, { onConflict: "communication_id" })
    .select("id");

  if (error) {
    console.error(`Failed to seed evaluation dataset: ${error.message}`);
    process.exit(1);
  }

  console.log(`Seeded/updated ${data?.length ?? 0} evaluation dataset entries.`);
}

async function main() {
  if (!isSupabaseConfigured()) {
    console.error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.",
    );
    process.exit(1);
  }

  const supabase = getSupabaseClient();

  const communications = await seedCommunications(supabase);
  await seedPersonalContext(supabase);
  await seedEvaluationDataset(supabase, communications);
}

main();
