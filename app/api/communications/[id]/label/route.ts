import { NextResponse } from "next/server";
import { clearGmailLabel, saveGmailLabel } from "@/lib/db/evaluation";
import { getSupabaseClient } from "@/lib/db/supabase-client";
import { ATTENTION_LEVELS } from "@/lib/decision-engine/types";

type Params = { params: Promise<{ id: string }> };

/** Only real-inbox messages are labeled here; the sample golden set is frozen and must not be overwritten. */
async function isLabelable(id: string): Promise<boolean> {
  const { data } = await getSupabaseClient().from("communications").select("source").eq("id", id).maybeSingle();
  return data != null && data.source !== "sample";
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const level = (await request.json().catch(() => null))?.level;

  if (!(ATTENTION_LEVELS as readonly string[]).includes(level)) {
    return NextResponse.json({ error: `level must be one of: ${ATTENTION_LEVELS.join(", ")}` }, { status: 400 });
  }
  if (!(await isLabelable(id))) {
    return NextResponse.json({ error: "Only real inbox messages can be labeled." }, { status: 400 });
  }

  try {
    await saveGmailLabel(id, level);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Save failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!(await isLabelable(id))) {
    return NextResponse.json({ error: "Only real inbox messages can be labeled." }, { status: 400 });
  }
  try {
    await clearGmailLabel(id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Remove failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
