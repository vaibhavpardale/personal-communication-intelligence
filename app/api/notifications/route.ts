import { NextResponse } from "next/server";
import { listCommunicationsWithAttention } from "@/lib/db/communications";
import { listSenderPreferences } from "@/lib/db/sender-preferences";
import { senderAddress } from "@/lib/decision-engine/preferences";
import type { Candidate } from "@/lib/notifications/prefs";

/**
 * Messages that could be worth an interruption. Which of them actually notify is decided
 * in the browser against the user's own settings, so those settings never leave the device.
 */
export async function GET() {
  const [all, preferences] = await Promise.all([listCommunicationsWithAttention(), listSenderPreferences()]);
  // Notifications are about your real mail; sample data only counts when there is nothing else.
  const hasGmail = all.some((c) => c.source === "gmail");

  const candidates: Candidate[] = all
    .filter((c) => (!hasGmail || c.source !== "sample") && (c.user_status ?? "unread") === "unread" && c.attention)
    .filter((c) => ["ACT_NOW", "REVIEW", "WATCH"].includes(c.attention!.level))
    // A muted sender never notifies, whatever the message says.
    .filter((c) => preferences[senderAddress(c.sender)] !== "muted")
    .map((c) => ({
      id: c.id,
      subject: c.subject,
      sender: c.sender_name ?? c.sender,
      level: c.attention!.level,
      // Only a real deadline counts. An event date is just "when it happened" for most mail.
      deadline: c.analysis?.deadline ?? null,
      why: c.attention!.why_it_matters ?? c.attention!.reason,
      received_at: c.received_at,
      vip: preferences[senderAddress(c.sender)] === "vip",
    }));

  return NextResponse.json({ candidates });
}
