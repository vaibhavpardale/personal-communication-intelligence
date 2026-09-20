"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AnalyzeButton({ communicationId }: { communicationId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/communications/${communicationId}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to analyze communication");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setIsSubmitting(false);
    }
  }

  const busy = isSubmitting || isPending;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={handleClick} disabled={busy}>
        {busy ? "Analyzing..." : "Analyze"}
      </Button>
      {error && <span className="max-w-56 text-right text-xs text-destructive">{error}</span>}
    </div>
  );
}
