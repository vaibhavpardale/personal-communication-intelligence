export const SYNC_RANGES = ["since_last", "today", "yesterday", "7d", "30d"] as const;
export type SyncRange = (typeof SYNC_RANGES)[number];

export const SYNC_RANGE_LABELS: Record<SyncRange, string> = {
  since_last: "Since last sync",
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export const DEFAULT_SYNC_RANGE: SyncRange = "since_last";

/** With no previous sync to continue from, "since last sync" looks back this far. */
const FIRST_SYNC_LOOKBACK_DAYS = 7;
/** Overlap so a message arriving in the same instant as the newest one is not missed (duplicates are skipped on import). */
const SINCE_LAST_OVERLAP_MS = 60_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isSyncRange(value: unknown): value is SyncRange {
  return typeof value === "string" && (SYNC_RANGES as readonly string[]).includes(value);
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The [after, before) time window a range stands for. `before` is null for "up to now". */
export function resolveSyncWindow(
  range: SyncRange,
  now: Date,
  latestReceivedAt: string | null,
): { after: Date; before: Date | null } {
  switch (range) {
    case "today":
      return { after: startOfLocalDay(now), before: null };
    case "yesterday": {
      const today = startOfLocalDay(now);
      return { after: new Date(today.getTime() - MS_PER_DAY), before: today };
    }
    case "7d":
      return { after: new Date(now.getTime() - 7 * MS_PER_DAY), before: null };
    case "30d":
      return { after: new Date(now.getTime() - 30 * MS_PER_DAY), before: null };
    case "since_last":
      return {
        after: latestReceivedAt
          ? new Date(new Date(latestReceivedAt).getTime() - SINCE_LAST_OVERLAP_MS)
          : new Date(now.getTime() - FIRST_SYNC_LOOKBACK_DAYS * MS_PER_DAY),
        before: null,
      };
  }
}
