import { describe, expect, it } from "vitest";
import { isSyncRange, resolveSyncWindow } from "@/lib/gmail/range";

const NOW = new Date(2026, 9, 9, 15, 30); // 9 Oct 2026, 15:30 local
const DAY = 24 * 60 * 60 * 1000;

describe("resolveSyncWindow", () => {
  it("today starts at local midnight", () => {
    const w = resolveSyncWindow("today", NOW, null);
    expect(w.after).toEqual(new Date(2026, 9, 9, 0, 0));
    expect(w.before).toBeNull();
  });

  it("yesterday is the previous local day, ending at today's midnight", () => {
    const w = resolveSyncWindow("yesterday", NOW, null);
    expect(w.after).toEqual(new Date(2026, 9, 8, 0, 0));
    expect(w.before).toEqual(new Date(2026, 9, 9, 0, 0));
  });

  it("7d and 30d are rolling windows ending now", () => {
    expect(resolveSyncWindow("7d", NOW, null).after.getTime()).toBe(NOW.getTime() - 7 * DAY);
    expect(resolveSyncWindow("30d", NOW, null).after.getTime()).toBe(NOW.getTime() - 30 * DAY);
  });

  it("since_last starts just before the newest imported message", () => {
    const latest = "2026-10-08T10:00:00.000Z";
    const w = resolveSyncWindow("since_last", NOW, latest);
    expect(w.after.getTime()).toBe(new Date(latest).getTime() - 60_000);
  });

  it("since_last falls back to the last 7 days on a first sync", () => {
    expect(resolveSyncWindow("since_last", NOW, null).after.getTime()).toBe(NOW.getTime() - 7 * DAY);
  });
});

describe("isSyncRange", () => {
  it("accepts known ranges only", () => {
    expect(isSyncRange("7d")).toBe(true);
    expect(isSyncRange("since_last")).toBe(true);
    expect(isSyncRange("yesterday ")).toBe(false);
    expect(isSyncRange(undefined)).toBe(false);
  });
});
