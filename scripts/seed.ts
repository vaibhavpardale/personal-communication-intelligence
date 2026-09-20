import "dotenv/config";
import { getSupabaseClient } from "../lib/db/supabase-client";
import { isSupabaseConfigured } from "../lib/config";
import { sampleCommunications } from "./sample-communications";
import { samplePersonalContext } from "./sample-personal-context";

async function seedCommunications(supabase: ReturnType<typeof getSupabaseClient>) {
  const { count, error: countError } = await supabase
    .from("communications")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error(`Failed to check existing communications: ${countError.message}`);
    process.exit(1);
  }

  if ((count ?? 0) > 0) {
    console.log(
      `communications table already has ${count} row(s). Skipping seed to avoid duplicates. ` +
        `Truncate the table first if you want to reseed.`,
    );
    return;
  }

  const { data, error } = await supabase
    .from("communications")
    .insert(sampleCommunications)
    .select("id");

  if (error) {
    console.error(`Failed to seed communications: ${error.message}`);
    process.exit(1);
  }

  console.log(`Seeded ${data?.length ?? 0} sample communications.`);
}

async function seedPersonalContext(supabase: ReturnType<typeof getSupabaseClient>) {
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

async function main() {
  if (!isSupabaseConfigured()) {
    console.error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.",
    );
    process.exit(1);
  }

  const supabase = getSupabaseClient();

  await seedCommunications(supabase);
  await seedPersonalContext(supabase);
}

main();
