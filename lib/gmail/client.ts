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
 * Fetches the most recent messages. Sequential per-message `get` calls, capped
 * by `maxResults` — a deliberately simple sync strategy (no pagination across
 * runs, no label filtering) appropriate for a personal capstone.
 */
export async function fetchRecentMessages(
  accessToken: string,
  maxResults = 20,
): Promise<GmailApiMessage[]> {
  const list = (await gmailFetch(accessToken, `/messages?maxResults=${maxResults}`)) as {
    messages?: { id: string }[];
  };
  const ids = list.messages ?? [];

  const messages: GmailApiMessage[] = [];
  for (const { id } of ids) {
    const message = (await gmailFetch(accessToken, `/messages/${id}?format=full`)) as GmailApiMessage;
    messages.push(message);
  }
  return messages;
}
