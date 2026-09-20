import { NextResponse } from "next/server";
import { deleteGmailConnection, getActiveGmailConnection } from "@/lib/db/gmail-connection";

export async function POST() {
  const connection = await getActiveGmailConnection();

  if (!connection) {
    return NextResponse.json({ error: "Gmail is not connected." }, { status: 400 });
  }

  await deleteGmailConnection(connection.id);

  return NextResponse.json({ disconnected: true });
}
