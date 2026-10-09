import type { AttentionLevel } from "@/lib/decision-engine/types";

/**
 * What deserves an interruption is personal, so it is the user's setting, not a global rule:
 *  - urgent:    only things Heed rates Act Now
 *  - deadlines: Act Now, plus anything with a deadline coming up (the default)
 *  - review:    also everything Heed would ask you to look at soon
 */
export type NotifyMode = "urgent" | "deadlines" | "review";

export interface NotifyPrefs {
  mode: NotifyMode;
  /** "deadlines" and "review" modes also notify when a deadline is this many days away or already passed. */
  deadlineDays: number;
  /** HH:MM, local time. No pop-up alerts between start and end (the bell still collects them). */
  quietStart: string;
  quietEnd: string;
  browser: boolean;
}

export const DEFAULT_PREFS: NotifyPrefs = {
  mode: "deadlines",
  deadlineDays: 3,
  quietStart: "21:00",
  quietEnd: "08:00",
  browser: false,
};

/** The lightweight view of a message the notifier works from. */
export interface Candidate {
  id: string;
  subject: string;
  sender: string;
  level: AttentionLevel;
  /** yyyy-mm-dd, from the message itself. */
  deadline: string | null;
  why: string | null;
  received_at: string;
  /** The user marked this sender as a VIP. */
  vip: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function daysUntil(deadline: string, now: Date): number {
  return Math.round((new Date(`${deadline}T00:00:00`).getTime() - startOfDay(now)) / MS_PER_DAY);
}

export function shouldNotify(c: Candidate, prefs: NotifyPrefs, now: Date = new Date()): boolean {
  if (c.level === "ACT_NOW") return true;
  // A sender you marked VIP is worth hearing about as soon as Heed would ask you to look.
  if (c.vip && c.level === "REVIEW") return true;
  if (prefs.mode === "review" && c.level === "REVIEW") return true;
  // Watch means "nothing to do yet", so a date on a Watch item never interrupts: the model often puts the
  // message's own date there (a newsletter, a debit alert), which is not a deadline.
  if (prefs.mode !== "urgent" && c.deadline && c.level === "REVIEW") {
    return daysUntil(c.deadline, now) <= prefs.deadlineDays;
  }
  return false;
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** True inside the quiet window, including one that runs overnight (21:00 to 08:00). */
export function isQuietHours(prefs: NotifyPrefs, now: Date = new Date()): boolean {
  const start = minutes(prefs.quietStart);
  const end = minutes(prefs.quietEnd);
  const current = now.getHours() * 60 + now.getMinutes();
  if (start === end) return false;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

/** Why a notification fired, in plain words, for the bell. */
export function reasonFor(c: Candidate, now: Date = new Date()): string {
  if (c.level === "ACT_NOW") return "Needs action now";
  if (c.vip) return "From a sender you marked VIP";
  if (c.deadline) {
    const d = daysUntil(c.deadline, now);
    if (d < 0) return `Deadline passed ${-d} day${d === -1 ? "" : "s"} ago`;
    if (d === 0) return "Deadline today";
    return `Deadline in ${d} day${d === 1 ? "" : "s"}`;
  }
  return "Worth a look";
}
