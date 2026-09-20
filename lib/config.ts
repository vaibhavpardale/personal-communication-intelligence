/**
 * Centralized application configuration. All environment variable access
 * should go through this module (Rule: centralize model/config, no
 * hard-coded secrets).
 *
 * Each field is a getter, not a value computed once at import time: in
 * Next.js the env is already loaded before any module runs, but in
 * standalone scripts (scripts/seed.ts) `dotenv` runs after this module has
 * already been imported (ES import statements are hoisted above other
 * code), so eagerly-read values would be frozen as empty strings. Getters
 * read `process.env` at access time instead, which is correct either way.
 */
export const config = {
  openai: {
    get apiKey() {
      return process.env.OPENAI_API_KEY ?? "";
    },
    get model() {
      return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    },
  },
  supabase: {
    get url() {
      return process.env.SUPABASE_URL ?? "";
    },
    get serviceRoleKey() {
      return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    },
  },
  gmail: {
    get clientId() {
      return process.env.GMAIL_CLIENT_ID ?? "";
    },
    get clientSecret() {
      return process.env.GMAIL_CLIENT_SECRET ?? "";
    },
    get redirectUri() {
      return process.env.GMAIL_REDIRECT_URI ?? "";
    },
  },
  app: {
    get url() {
      return process.env.APP_URL ?? "http://localhost:3000";
    },
  },
};

export function isOpenAiConfigured(): boolean {
  return config.openai.apiKey.length > 0;
}

export function isSupabaseConfigured(): boolean {
  return config.supabase.url.length > 0 && config.supabase.serviceRoleKey.length > 0;
}

export function isGmailConfigured(): boolean {
  return (
    config.gmail.clientId.length > 0 &&
    config.gmail.clientSecret.length > 0 &&
    config.gmail.redirectUri.length > 0
  );
}
