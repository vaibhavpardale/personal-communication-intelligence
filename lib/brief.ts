import type { AttentionLevel } from "@/lib/decision-engine/types";
import { LEVEL_META } from "@/lib/decision-engine/level-meta";
import { daysUntil } from "@/lib/notifications/prefs";
import type { CommunicationWithAttention } from "@/types/attention";

export interface BriefItem {
  id: string;
  subject: string;
  sender: string;
  level: AttentionLevel;
  why: string | null;
  next: string | null;
  deadline: string | null;
  /** Days until the deadline: negative when it has passed. */
  days: number | null;
}

export interface Brief {
  headline: string;
  needsYou: BriefItem[];
  thisWeek: BriefItem[];
  filed: { watch: number; quiet: number };
  total: number;
}

const LEVEL_RANK: Record<AttentionLevel, number> = { ACT_NOW: 0, REVIEW: 1, WATCH: 2, LOW_PRIORITY: 3, NO_ACTION: 4 };
const MAX_PER_SECTION = 5;

function toItem(c: CommunicationWithAttention, now: Date): BriefItem | null {
  if (!c.attention) return null;
  // Only a real deadline counts; an event date is usually just when the message was about.
  const deadline = c.analysis?.deadline ?? null;
  return {
    id: c.id,
    subject: c.subject,
    sender: c.sender_name ?? c.sender,
    level: c.attention.level,
    why: c.attention.why_it_matters ?? c.attention.reason,
    next: c.attention.what_you_can_do,
    deadline,
    days: deadline ? daysUntil(deadline, now) : null,
  };
}

/** The few things that matter today, what is coming this week, and how much was filed away. */
export function buildBrief(communications: CommunicationWithAttention[], now: Date = new Date()): Brief {
  const open = communications.filter((c) => (c.user_status ?? "unread") === "unread");
  const items = open.map((c) => toItem(c, now)).filter((i): i is BriefItem => i !== null);

  const bySoonest = (a: BriefItem, b: BriefItem) =>
    LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || (a.days ?? 9999) - (b.days ?? 9999);

  const needsYou = items.filter((i) => i.level === "ACT_NOW" || i.level === "REVIEW").sort(bySoonest).slice(0, MAX_PER_SECTION);
  const shown = new Set(needsYou.map((i) => i.id));
  const thisWeek = items
    .filter((i) => {
      if (shown.has(i.id) || i.days === null || i.days > 7) return false;
      if (i.level === "ACT_NOW" || i.level === "REVIEW") return i.days >= 0;
      // A Watch item is only "coming" when its date is still ahead; today or earlier is usually just the message's own date.
      return i.level === "WATCH" && i.days >= 1;
    })
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
    .slice(0, MAX_PER_SECTION);

  const headline =
    needsYou.length === 0
      ? "Nothing needs you today."
      : `${needsYou.length} thing${needsYou.length === 1 ? "" : "s"} need${needsYou.length === 1 ? "s" : ""} you today.`;

  return {
    headline,
    needsYou,
    thisWeek,
    filed: {
      watch: items.filter((i) => i.level === "WATCH").length,
      quiet: items.filter((i) => i.level === "LOW_PRIORITY" || i.level === "NO_ACTION").length,
    },
    total: open.length,
  };
}

function when(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return `, ${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return ", due today";
  if (days === 1) return ", due tomorrow";
  return `, due in ${days} days`;
}

/** Plain text, ready to paste into Slack or an email. */
export function briefToText(brief: Brief, date: Date = new Date()): string {
  const lines = [`Pith brief, ${date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}`, brief.headline, ""];
  const section = (title: string, items: BriefItem[]) => {
    if (items.length === 0) return;
    lines.push(title);
    for (const i of items) {
      lines.push(`- [${LEVEL_META[i.level].label}] ${i.subject} (${i.sender}${when(i.days)})`);
      if (i.next) lines.push(`  Next: ${i.next}`);
    }
    lines.push("");
  };
  section("Needs you", brief.needsYou);
  section("Coming this week", brief.thisWeek);
  lines.push(`Filed away: ${brief.filed.watch} to watch, ${brief.filed.quiet} low priority or noise.`);
  return lines.join("\n");
}
