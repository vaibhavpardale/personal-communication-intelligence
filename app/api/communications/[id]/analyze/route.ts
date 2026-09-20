import { NextResponse } from "next/server";
import { getCommunicationWithAnalysis } from "@/lib/db/communications";
import { processCommunication } from "@/lib/pipeline/process-communication";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const communication = await getCommunicationWithAnalysis(id);

  if (!communication) {
    return NextResponse.json({ error: "Communication not found" }, { status: 404 });
  }

  const result = await processCommunication(communication);

  if (result.status === "error") {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ analysis: result.analysis });
}
