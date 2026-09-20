import { NextResponse } from "next/server";
import { deleteCommunicationsBySource } from "@/lib/db/communications";

/** Deletes all imported Gmail communications (and, via FK cascade, their
 * analysis, attention decisions, and feedback) without disconnecting the
 * account. */
export async function POST() {
  const deleted = await deleteCommunicationsBySource("gmail");
  return NextResponse.json({ deleted });
}
