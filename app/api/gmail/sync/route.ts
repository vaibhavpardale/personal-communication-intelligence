import { NextResponse } from "next/server";
import { getActiveGmailConnection } from "@/lib/db/gmail-connection";
import { fetchRecentMessages, getValidAccessToken } from "@/lib/gmail/client";
import { normalizeGmailMessage } from "@/lib/gmail/normalize";
import { upsertExternalCommunications } from "@/lib/db/communications";
import { listPersonalContext } from "@/lib/db/personal-context";
import { processCommunication } from "@/lib/pipeline/process-communication";

const DEFAULT_MAX = 20;
const HARD_CAP = 50;

export async function POST(request: Request) {
  const connection = await getActiveGmailConnection();

  if (!connection) {
    return NextResponse.json({ error: "Gmail is not connected." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const requested = Number(searchParams.get("max") ?? DEFAULT_MAX);
  const maxResults = Math.min(Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_MAX, HARD_CAP);

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
  const messages = await fetchRecentMessages(accessToken, maxResults);
  const normalized = messages.map(normalizeGmailMessage) as (ReturnType<
    typeof normalizeGmailMessage
  > & { external_id: string })[];

  // Reuses the same communications table and the same pipeline used for sample
  // data — Gmail gets no separate AI pipeline.
  const imported = await upsertExternalCommunications(normalized);
  const personalContext = await listPersonalContext();

  let analyzed = 0;
  let failed = 0;
  for (const communication of imported) {
    const result = await processCommunication(communication, personalContext);
    if (result.status === "success") analyzed += 1;
    else failed += 1;
  }

  return NextResponse.json({
    fetched: messages.length,
    imported: imported.length,
    analyzed,
    failed,
  });
}
