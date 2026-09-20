import { NextResponse } from "next/server";
import { getCommunicationWithAnalysis } from "@/lib/db/communications";
import { listPersonalContext } from "@/lib/db/personal-context";
import { processCommunication } from "@/lib/pipeline/process-communication";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const communication = await getCommunicationWithAnalysis(id);

  if (!communication) {
    return NextResponse.json({ error: "Communication not found" }, { status: 404 });
  }

  const personalContext = await listPersonalContext();
  const result = await processCommunication(communication, personalContext);

  if (result.status === "error") {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ analysis: result.analysis, attention: result.attention });
}
