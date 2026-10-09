import { NextResponse } from "next/server";
import { getActiveGmailConnection } from "@/lib/db/gmail-connection";
import { buildMessageQuery, fetchMessages, getValidAccessToken } from "@/lib/gmail/client";
import { normalizeGmailMessage } from "@/lib/gmail/normalize";
import {
  DEFAULT_SYNC_RANGE,
  SYNC_RANGE_LABELS,
  isSyncRange,
  resolveSyncWindow,
} from "@/lib/gmail/range";
import { getLatestGmailReceivedAt, upsertExternalCommunications } from "@/lib/db/communications";
import { listPersonalContext } from "@/lib/db/personal-context";
import { listSenderPreferences } from "@/lib/db/sender-preferences";
import { processCommunication } from "@/lib/pipeline/process-communication";

/** Every imported message costs AI calls, so one sync is capped. */
const MAX_PER_SYNC = 100;
const ANALYZE_BATCH_SIZE = 5;

export async function POST(request: Request) {
  const connection = await getActiveGmailConnection();

  if (!connection) {
    return NextResponse.json({ error: "Gmail is not connected." }, { status: 400 });
  }

  const requestedRange = new URL(request.url).searchParams.get("range");
  const range = isSyncRange(requestedRange) ? requestedRange : DEFAULT_SYNC_RANGE;
  const window = resolveSyncWindow(range, new Date(), await getLatestGmailReceivedAt());

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(connection);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Gmail token refresh failed:", message);
    if (message.includes("invalid_grant")) {
      return NextResponse.json(
        {
          error:
            "Google rejected the saved Gmail authorization (expired or revoked). Go to Settings and reconnect Gmail.",
        },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: "Could not refresh Gmail access." }, { status: 502 });
  }

  const { messages, truncated } = await fetchMessages(accessToken, {
    query: buildMessageQuery(window),
    maxResults: MAX_PER_SYNC,
    // Incremental sync resumes from the newest imported message, so keep the oldest ones
    // when over the cap and the next sync carries on from there.
    keep: range === "since_last" ? "oldest" : "newest",
  });
  const normalized = messages.map(normalizeGmailMessage) as (ReturnType<
    typeof normalizeGmailMessage
  > & { external_id: string })[];

  // Reuses the same communications table and the same pipeline used for sample
  // data — Gmail gets no separate AI pipeline.
  const imported = await upsertExternalCommunications(normalized);
  const personalContext = await listPersonalContext();
  const senderPreferences = await listSenderPreferences();

  let analyzed = 0;
  let failed = 0;
  for (let i = 0; i < imported.length; i += ANALYZE_BATCH_SIZE) {
    const results = await Promise.all(
      imported.slice(i, i + ANALYZE_BATCH_SIZE).map((c) => processCommunication(c, personalContext, senderPreferences)),
    );
    for (const result of results) {
      if (result.status === "success") analyzed += 1;
      else failed += 1;
    }
  }

  return NextResponse.json({
    range: SYNC_RANGE_LABELS[range],
    fetched: messages.length,
    imported: imported.length,
    analyzed,
    failed,
    truncated,
  });
}
