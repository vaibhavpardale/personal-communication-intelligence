import { refreshAccessToken } from "@/lib/gmail/oauth";
import { updateGmailAccessToken } from "@/lib/db/gmail-connection";
import type { GmailConnection } from "@/types/gmail";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const REFRESH_BUFFER_MS = 60_000;

/** Returns a usable access token, refreshing it first if it's expired (or about to be). */
export async function getValidAccessToken(connection: GmailConnection): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at).getTime();

  if (Date.now() < expiresAt - REFRESH_BUFFER_MS) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    throw new Error("Gmail access token expired and no refresh token is available; please reconnect.");
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await updateGmailAccessToken(connection.id, refreshed.access_token, newExpiresAt);
  return refreshed.access_token;
}

export interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

export interface GmailApiMessage {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: { name: string; value: string }[];
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
}

async function gmailFetch(accessToken: string, path: string): Promise<unknown> {
  const response = await fetch(`${GMAIL_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Gmail API request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function getProfileEmail(accessToken: string): Promise<string> {
  const profile = (await gmailFetch(accessToken, "/profile")) as { emailAddress: string };
  return profile.emailAddress;
}

/**
 * Gmail search for a time window. Gmail's `after:`/`before:` take epoch seconds.
 * Sent mail and drafts are excluded: they are not things that need attention.
 */
export function buildMessageQuery(window: { after: Date; before: Date | null }): string {
  const parts = [`after:${Math.floor(window.after.getTime() / 1000)}`];
  if (window.before) parts.push(`before:${Math.floor(window.before.getTime() / 1000)}`);
  parts.push("-in:sent", "-in:drafts");
  return parts.join(" ");
}

/** Listing ids is cheap, so look at up to this many matches before applying the import cap. */
const LIST_LIMIT = 500;
const FETCH_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}

export interface FetchMessagesResult {
  messages: GmailApiMessage[];
  /** True when more messages matched than `maxResults`, so the rest were left for a later sync. */
  truncated: boolean;
}

/**
 * Fetches messages matching a Gmail search query, following pagination.
 * Gmail lists newest first. `keep: "newest"` imports the newest `maxResults`;
 * `keep: "oldest"` imports the oldest, so an incremental sync that resumes from
 * the newest imported message never skips the ones left behind.
 */
export async function fetchMessages(
  accessToken: string,
  { query, maxResults, keep = "newest" }: { query: string; maxResults: number; keep?: "newest" | "oldest" },
): Promise<FetchMessagesResult> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ q: query, maxResults: String(Math.min(100, LIST_LIMIT - ids.length)) });
    if (pageToken) params.set("pageToken", pageToken);
    const page = (await gmailFetch(accessToken, `/messages?${params}`)) as {
      messages?: { id: string }[];
      nextPageToken?: string;
    };
    ids.push(...(page.messages ?? []).map((m) => m.id));
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < LIST_LIMIT);

  const truncated = ids.length > maxResults;
  const chosen = truncated ? (keep === "oldest" ? ids.slice(-maxResults) : ids.slice(0, maxResults)) : ids;

  const messages = await mapWithConcurrency(
    chosen,
    FETCH_CONCURRENCY,
    (id) => gmailFetch(accessToken, `/messages/${id}?format=full`) as Promise<GmailApiMessage>,
  );
  return { messages, truncated };
}
