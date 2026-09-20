"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleClick() {
    setIsRunning(true);
    setSummary(null);
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setSummary(body.error ?? "Sync failed.");
        return;
      }
      setSummary(
        `Fetched ${body.fetched}, imported ${body.imported} new, analyzed ${body.analyzed}` +
          (body.failed ? `, ${body.failed} failed` : ""),
      );
      router.refresh();
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" onClick={handleClick} disabled={isRunning}>
        {isRunning ? "Syncing..." : "Sync now"}
      </Button>
      {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
    </div>
  );
}
