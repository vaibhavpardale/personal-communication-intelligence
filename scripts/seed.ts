import "dotenv/config";
import { getSupabaseClient } from "../lib/db/supabase-client";
import { isSupabaseConfigured } from "../lib/config";
import { sampleCommunications } from "./sample-communications";

async function main() {
  if (!isSupabaseConfigured()) {
    console.error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.",
    );
    process.exit(1);
  }

  const supabase = getSupabaseClient();

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

main();
