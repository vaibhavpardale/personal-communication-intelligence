import { config } from "@/lib/config";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/** Read-only, least-privilege: this app never sends, deletes, or modifies mail. */
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.gmail.clientId,
    redirect_uri: config.gmail.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.gmail.clientId,
      client_secret: config.gmail.clientSecret,
      redirect_uri: config.gmail.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to exchange Gmail authorization code: ${response.status} ${await response.text()}`,
    );
  }

  return response.json() as Promise<TokenResponse>;
}

export interface RefreshResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.gmail.clientId,
      client_secret: config.gmail.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to refresh Gmail access token: ${response.status} ${await response.text()}`,
    );
  }

  return response.json() as Promise<RefreshResponse>;
}
