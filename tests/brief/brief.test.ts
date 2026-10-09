import { describe, expect, it } from "vitest";
import { briefToText, buildBrief } from "@/lib/brief";
import type { CommunicationWithAttention } from "@/types/attention";

const NOW = new Date(2026, 9, 9, 9, 0);
const day = (offset: number) => {
  const d = new Date(2026, 9, 9 + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function comm(id: string, level: string, over: { deadline?: string | null; status?: string; next?: string } = {}): CommunicationWithAttention {
  return {
    id,
    subject: `Subject ${id}`,
    sender: `${id}@x.com`,
    sender_name: null,
    user_status: over.status ?? "unread",
    analysis: { deadline: over.deadline ?? null, event_date: null },
    attention: { level, why_it_matters: `why ${id}`, reason: "r", what_you_can_do: over.next ?? null },
  } as unknown as CommunicationWithAttention;
}

describe("buildBrief", () => {
  it("puts Act Now first, then Review by soonest deadline, capped at five", () => {
    const brief = buildBrief(
      [
        comm("r-late", "REVIEW", { deadline: day(5) }),
        comm("a", "ACT_NOW"),
        comm("r-soon", "REVIEW", { deadline: day(1) }),
        ...["x1", "x2", "x3", "x4"].map((id) => comm(id, "REVIEW")),
      ],
      NOW,
    );
    expect(brief.needsYou).toHaveLength(5);
    expect(brief.needsYou.slice(0, 3).map((i) => i.id)).toEqual(["a", "r-soon", "r-late"]);
    expect(brief.headline).toBe("5 things need you today.");
  });
  it("lists dated Watch items coming this week without repeating items already shown", () => {
    const brief = buildBrief(
      [
        comm("a", "ACT_NOW", { deadline: day(1) }),
        comm("w1", "WATCH", { deadline: day(3) }),
        comm("w2", "WATCH", { deadline: day(20) }),
        comm("w-today", "WATCH", { deadline: day(0) }),
        comm("w-past", "WATCH", { deadline: day(-1) }),
      ],
      NOW,
    );
    expect(brief.thisWeek.map((i) => i.id)).toEqual(["w1"]);
  });
  it("ignores handled items and counts what was filed away", () => {
    const brief = buildBrief([comm("d", "ACT_NOW", { status: "done" }), comm("l", "LOW_PRIORITY"), comm("n", "NO_ACTION"), comm("w", "WATCH")], NOW);
    expect(brief.needsYou).toHaveLength(0);
    expect(brief.headline).toBe("Nothing needs you today.");
    expect(brief.filed).toEqual({ watch: 1, quiet: 2 });
    expect(brief.total).toBe(3);
  });
  it("renders paste-ready plain text", () => {
    const text = briefToText(buildBrief([comm("a", "ACT_NOW", { deadline: day(-2), next: "Pay it" })], NOW), NOW);
    expect(text).toContain("1 thing needs you today.");
    expect(text).toContain("- [Act Now] Subject a (a@x.com, 2 days overdue)");
    expect(text).toContain("  Next: Pay it");
    expect(text).toContain("Filed away: 0 to watch, 0 low priority or noise.");
  });
});
