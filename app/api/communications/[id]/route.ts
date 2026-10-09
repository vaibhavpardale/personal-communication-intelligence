import { NextResponse } from "next/server";
import { deleteCommunication, setCommunicationStatus } from "@/lib/db/communications";

const STATUSES = ["unread", "read", "hidden"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (!(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
  }

  try {
    await setCommunicationStatus(id, status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    // Most likely migration 0006 has not been applied yet.
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteCommunication(id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delete failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
