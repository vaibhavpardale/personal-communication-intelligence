import { NextResponse } from "next/server";
import { setSenderPreference } from "@/lib/db/sender-preferences";
import { SENDER_PREFERENCES, senderAddress } from "@/lib/decision-engine/preferences";
import { redecide } from "@/lib/pipeline/redecide";

/** POST { sender, preference: "vip" | "muted" | null }. Saves it, then re-decides that sender's mail (no AI calls). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const sender = typeof body?.sender === "string" ? senderAddress(body.sender) : "";
  const preference = body?.preference ?? null;

  if (!sender || (preference !== null && !(SENDER_PREFERENCES as readonly string[]).includes(preference))) {
    return NextResponse.json({ error: "Send { sender, preference: 'vip' | 'muted' | null }." }, { status: 400 });
  }

  try {
    await setSenderPreference(sender, preference);
    const { changed } = await redecide({ sender });
    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save." }, { status: 500 });
  }
}
