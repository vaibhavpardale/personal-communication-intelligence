import { NextResponse } from "next/server";
import { saveFeedback } from "@/lib/db/feedback";
import { FEEDBACK_TYPES, type FeedbackType } from "@/types/feedback";

function isFeedbackType(value: unknown): value is FeedbackType {
  return typeof value === "string" && (FEEDBACK_TYPES as readonly string[]).includes(value);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const feedbackType = body?.feedback_type;

  if (!isFeedbackType(feedbackType)) {
    return NextResponse.json(
      { error: `feedback_type must be one of: ${FEEDBACK_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const feedback = await saveFeedback({ communication_id: id, feedback_type: feedbackType });

  return NextResponse.json({ feedback });
}
