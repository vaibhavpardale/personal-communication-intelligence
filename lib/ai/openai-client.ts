import OpenAI from "openai";
import { config } from "@/lib/config";

let client: OpenAI | null = null;

/** Lazily-constructed singleton so tests can mock this module without needing an API key. */
export function getOpenAiClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return client;
}
