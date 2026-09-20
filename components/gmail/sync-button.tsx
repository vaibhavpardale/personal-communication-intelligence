"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const LIMIT_OPTIONS = [10, 20, 30, 50] as const;
const DEFAULT_LIMIT = 20;

export function SyncButton() {
  const router = useRouter();
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleClick() {
    setIsRunning(true);
    setSummary(null);
    try {
      const res = await fetch(`/api/gmail/sync?max=${limit}`, { method: "POST" });
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
      <div className="flex items-center gap-2">
        <label htmlFor="gmail-sync-limit" className="text-xs text-muted-foreground">
          Emails to check
        </label>
        <select
          id="gmail-sync-limit"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          disabled={isRunning}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs"
        >
          {LIMIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={handleClick} disabled={isRunning}>
          {isRunning ? "Syncing..." : "Sync now"}
        </Button>
      </div>
      {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
    </div>
  );
}
