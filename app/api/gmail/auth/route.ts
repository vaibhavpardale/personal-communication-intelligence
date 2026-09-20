import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/gmail/oauth";
import { isGmailConfigured } from "@/lib/config";

const STATE_COOKIE = "gmail_oauth_state";

export async function GET() {
  if (!isGmailConfigured()) {
    return NextResponse.json({ error: "Gmail integration is not configured." }, { status: 501 });
  }

  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(buildAuthUrl(state));

  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
