import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, daysUntil, isQuietHours, reasonFor, shouldNotify, type Candidate, type NotifyPrefs } from "@/lib/notifications/prefs";

const NOW = new Date(2026, 9, 9, 14, 0); // 9 Oct 2026, 14:00 local
const day = (offset: number) => {
  const d = new Date(2026, 9, 9 + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const cand = (over: Partial<Candidate> = {}): Candidate => ({
  id: "c", subject: "s", sender: "x@y.com", level: "REVIEW", deadline: null, why: null, received_at: "2026-10-09T00:00:00Z", vip: false, ...over,
});
const prefs = (over: Partial<NotifyPrefs> = {}): NotifyPrefs => ({ ...DEFAULT_PREFS, ...over });

describe("shouldNotify", () => {
  it("always notifies for Act Now, whatever the mode", () => {
    for (const mode of ["urgent", "deadlines", "review"] as const) expect(shouldNotify(cand({ level: "ACT_NOW" }), prefs({ mode }), NOW)).toBe(true);
  });
  it("urgent mode ignores everything else, even with a deadline", () => {
    expect(shouldNotify(cand({ level: "REVIEW", deadline: day(0) }), prefs({ mode: "urgent" }), NOW)).toBe(false);
  });
  it("deadlines mode notifies when a deadline is near or already past, and not otherwise", () => {
    expect(shouldNotify(cand({ deadline: day(3) }), prefs({ mode: "deadlines", deadlineDays: 3 }), NOW)).toBe(true);
    expect(shouldNotify(cand({ deadline: day(4) }), prefs({ mode: "deadlines", deadlineDays: 3 }), NOW)).toBe(false);
    expect(shouldNotify(cand({ deadline: day(-2), level: "REVIEW" }), prefs(), NOW)).toBe(true);
    expect(shouldNotify(cand({ deadline: null }), prefs(), NOW)).toBe(false);
  });
  it("never interrupts for a Watch item, whatever date it carries", () => {
    expect(shouldNotify(cand({ level: "WATCH", deadline: day(0) }), prefs({ mode: "review" }), NOW)).toBe(false);
    expect(shouldNotify(cand({ level: "WATCH", deadline: day(-2) }), prefs(), NOW)).toBe(false);
  });
  it("review mode also notifies for plain Review items", () => {
    expect(shouldNotify(cand({ level: "REVIEW" }), prefs({ mode: "review" }), NOW)).toBe(true);
    expect(shouldNotify(cand({ level: "WATCH" }), prefs({ mode: "review" }), NOW)).toBe(false);
  });
  it("never notifies for low priority mail, even near a deadline", () => {
    expect(shouldNotify(cand({ level: "LOW_PRIORITY", deadline: day(0) }), prefs({ mode: "review" }), NOW)).toBe(false);
  });
  it("lets a VIP sender through at Review in any mode", () => {
    expect(shouldNotify(cand({ level: "REVIEW", vip: true }), prefs({ mode: "urgent" }), NOW)).toBe(true);
    expect(shouldNotify(cand({ level: "WATCH", vip: true }), prefs({ mode: "urgent" }), NOW)).toBe(false);
  });
});

describe("isQuietHours", () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 9, h, m);
  it("handles an overnight window", () => {
    const p = prefs({ quietStart: "21:00", quietEnd: "08:00" });
    expect(isQuietHours(p, at(22))).toBe(true);
    expect(isQuietHours(p, at(2))).toBe(true);
    expect(isQuietHours(p, at(8))).toBe(false);
    expect(isQuietHours(p, at(14))).toBe(false);
  });
  it("handles a same-day window and an empty one", () => {
    expect(isQuietHours(prefs({ quietStart: "13:00", quietEnd: "15:00" }), at(14))).toBe(true);
    expect(isQuietHours(prefs({ quietStart: "13:00", quietEnd: "15:00" }), at(16))).toBe(false);
    expect(isQuietHours(prefs({ quietStart: "09:00", quietEnd: "09:00" }), at(9, 30))).toBe(false);
  });
});

describe("reasonFor / daysUntil", () => {
  it("explains why in plain words", () => {
    expect(reasonFor(cand({ level: "ACT_NOW" }), NOW)).toBe("Needs action now");
    expect(reasonFor(cand({ deadline: day(0) }), NOW)).toBe("Deadline today");
    expect(reasonFor(cand({ deadline: day(2) }), NOW)).toBe("Deadline in 2 days");
    expect(reasonFor(cand({ deadline: day(-1) }), NOW)).toBe("Deadline passed 1 day ago");
    expect(reasonFor(cand({ vip: true }), NOW)).toBe("From a sender you marked VIP");
  });
  it("counts whole days regardless of the time of day", () => {
    expect(daysUntil(day(1), new Date(2026, 9, 9, 23, 59))).toBe(1);
  });
});
