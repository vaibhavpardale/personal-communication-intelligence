import "dotenv/config";
import { getSupabaseClient } from "../lib/db/supabase-client";
import { isSupabaseConfigured } from "../lib/config";
import { sampleCommunications } from "./sample-communications";
import { samplePersonalContext } from "./sample-personal-context";
import { goldenLabels } from "./golden-labels";

type SupabaseClient = ReturnType<typeof getSupabaseClient>;

async function seedCommunications(
  supabase: SupabaseClient,
): Promise<{ id: string; subject: string }[]> {
  const { count, error: countError } = await supabase
    .from("communications")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error(`Failed to check existing communications: ${countError.message}`);
    process.exit(1);
  }

  if ((count ?? 0) > 0) {
    console.log(
      `communications table already has ${count} row(s); skipping insert (will still ` +
        `seed/update personal context and the evaluation dataset).`,
    );
    const { data, error } = await supabase.from("communications").select("id, subject");
    if (error) {
      console.error(`Failed to load existing communications: ${error.message}`);
      process.exit(1);
    }
    return data ?? [];
  }

  const { data, error } = await supabase
    .from("communications")
    .insert(sampleCommunications)
    .select("id, subject");

  if (error) {
    console.error(`Failed to seed communications: ${error.message}`);
    process.exit(1);
  }

  console.log(`Seeded ${data?.length ?? 0} sample communications.`);
  return data ?? [];
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
