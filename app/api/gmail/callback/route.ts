import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, GMAIL_SCOPE } from "@/lib/gmail/oauth";
import { getProfileEmail } from "@/lib/gmail/client";
import { saveGmailConnection } from "@/lib/db/gmail-connection";
import { logError, logInfo } from "@/lib/observability/logger";

const STATE_COOKIE = "gmail_oauth_state";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  const redirectTo = (status: string) =>
    NextResponse.redirect(new URL(`/settings?gmail=${status}`, request.url));

  if (oauthError) {
    logError("gmail.oauth_denied", { error: oauthError });
    return redirectTo("denied");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    logError("gmail.oauth_state_mismatch", {});
    return redirectTo("error");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await getProfileEmail(tokens.access_token);

    await saveGmailConnection({
      email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope || GMAIL_SCOPE,
    });

    logInfo("gmail.connected", { email });

    const response = redirectTo("connected");
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (err) {
    logError("gmail.oauth_callback_failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return redirectTo("error");
  }
}
