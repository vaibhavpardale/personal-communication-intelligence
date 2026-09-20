/**
 * Centralized application configuration. All environment variable access
 * should go through this module (Rule: centralize model/config, no
 * hard-coded secrets).
 */
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  },
  supabase: {
    url: process.env.SUPABASE_URL ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  app: {
    url: process.env.APP_URL ?? "http://localhost:3000",
  },
};

export function isOpenAiConfigured(): boolean {
  return config.openai.apiKey.length > 0;
}

export function isSupabaseConfigured(): boolean {
  return config.supabase.url.length > 0 && config.supabase.serviceRoleKey.length > 0;
}
