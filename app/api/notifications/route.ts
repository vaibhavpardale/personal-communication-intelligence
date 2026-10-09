import { NextResponse } from "next/server";
import { listCommunicationsWithAttention } from "@/lib/db/communications";
import type { Candidate } from "@/lib/notifications/prefs";

/**
 * Messages that could be worth an interruption. Which of them actually notify is decided
 * in the browser against the user's own settings, so those settings never leave the device.
 */
export async function GET() {
  const all = await listCommunicationsWithAttention();
  // Notifications are about your real mail; sample data only counts when there is nothing else.
  const hasGmail = all.some((c) => c.source === "gmail");

  const candidates: Candidate[] = all
    .filter((c) => (!hasGmail || c.source !== "sample") && (c.user_status ?? "unread") === "unread" && c.attention)
    .filter((c) => ["ACT_NOW", "REVIEW", "WATCH"].includes(c.attention!.level))
    .map((c) => ({
      id: c.id,
      subject: c.subject,
      sender: c.sender_name ?? c.sender,
      level: c.attention!.level,
      // Only a real deadline counts. An event date is just "when it happened" for most mail.
      deadline: c.analysis?.deadline ?? null,
      why: c.attention!.why_it_matters ?? c.attention!.reason,
      received_at: c.received_at,
      vip: false,
    }));

  return NextResponse.json({ candidates });
}
