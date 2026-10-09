"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { DEFAULT_SYNC_RANGE, SYNC_RANGES, SYNC_RANGE_LABELS, type SyncRange } from "@/lib/gmail/range";

export function SyncButton() {
  const router = useRouter();
  const [range, setRange] = useState<SyncRange>(DEFAULT_SYNC_RANGE);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleClick() {
    setIsRunning(true);
    setSummary(null);
    try {
      const res = await fetch(`/api/gmail/sync?range=${range}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSummary(body.error ?? `Sync failed (HTTP ${res.status}).`);
        return;
      }
      setSummary(
        body.imported === 0
          ? `${body.range}: nothing new (${body.fetched} already imported)`
          : `${body.range}: imported ${body.imported} new, analyzed ${body.analyzed}` +
              (body.failed ? `, ${body.failed} failed` : "") +
              (body.truncated ? ". More are waiting, sync again to continue." : ""),
      );
      router.refresh();
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor="gmail-sync-range" className="text-xs text-muted-foreground">
          Sync
        </label>
        <select
          id="gmail-sync-range"
          value={range}
          onChange={(e) => setRange(e.target.value as SyncRange)}
          disabled={isRunning}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs"
        >
          {SYNC_RANGES.map((option) => (
            <option key={option} value={option}>
              {SYNC_RANGE_LABELS[option]}
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
