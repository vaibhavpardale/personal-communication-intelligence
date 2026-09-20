"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FeedbackType } from "@/types/feedback";

const OPTIONS: { type: FeedbackType; label: string }[] = [
  { type: "IMPORTANT", label: "Important" },
  { type: "NOT_IMPORTANT", label: "Not important" },
  { type: "DISMISS", label: "Dismiss" },
];

/**
 * Records how the user actually felt about this communication. Purely for
 * evaluation and future improvement — this does not personalize anything yet.
 */
export function FeedbackButtons({ communicationId }: { communicationId: string }) {
  const [submitted, setSubmitted] = useState<FeedbackType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(type: FeedbackType) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/communications/${communicationId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_type: type }),
      });
      if (res.ok) {
        setSubmitted(type);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return <p className="text-sm text-muted-foreground">Thanks, feedback recorded.</p>;
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map((option) => (
        <Button
          key={option.type}
          size="sm"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => submit(option.type)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
