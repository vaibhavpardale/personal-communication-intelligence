"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AnalyzeAllResponse {
  totalPending: number;
  analyzed: number;
  failed: number;
}

export function AnalyzeAllButton() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);

  async function handleClick() {
    setIsRunning(true);
    setSummary(null);
    try {
      const res = await fetch("/api/communications/analyze-all", { method: "POST" });
      const body = (await res.json()) as AnalyzeAllResponse;
      setSummary(
        `Analyzed ${body.analyzed}/${body.totalPending}` +
          (body.failed ? ` · ${body.failed} failed` : ""),
      );
      startTransition(() => router.refresh());
    } finally {
      setIsRunning(false);
    }
  }

  const busy = isRunning || isPending;

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={busy}>
        {busy ? "Analyzing all..." : "Analyze All"}
      </Button>
      {summary && <span className="text-sm text-muted-foreground">{summary}</span>}
    </div>
  );
}
