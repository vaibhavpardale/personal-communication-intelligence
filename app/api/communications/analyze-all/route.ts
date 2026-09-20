import { NextResponse } from "next/server";
import { listCommunicationsWithAnalysis } from "@/lib/db/communications";
import { processCommunication } from "@/lib/pipeline/process-communication";

const BATCH_SIZE = 5;

export async function POST() {
  const communications = await listCommunicationsWithAnalysis();
  const pending = communications.filter((c) => !c.analysis);

  let analyzed = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((c) => processCommunication(c)));

    results.forEach((result, index) => {
      if (result.status === "success") {
        analyzed += 1;
      } else {
        failed += 1;
        errors.push({ id: batch[index].id, error: result.error });
      }
    });
  }

  return NextResponse.json({
    totalPending: pending.length,
    analyzed,
    failed,
    errors,
  });
}
