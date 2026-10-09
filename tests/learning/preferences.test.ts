import { describe, expect, it } from "vitest";
import type { PersonalContextEntry } from "@/lib/context/types";
import { decideWithPreferences, senderAddress } from "@/lib/decision-engine/preferences";
import type { DecisionEngineInput } from "@/lib/decision-engine/types";

const NOW = new Date(2026, 9, 9);
const input = (over: Partial<DecisionEngineInput> = {}): DecisionEngineInput => ({
  category: "WORK",
  intent: "UPDATE",
  organization: null,
  people: null,
  entities: null,
  product_service: null,
  deadline: null,
  event_date: null,
  amount: null,
  requested_action: null,
  sender: "Ravi <ravi@acme.com>",
  sender_name: "Ravi",
  ...over,
});
const noContext: PersonalContextEntry[] = [];

describe("senderAddress", () => {
  it("extracts and lowercases the address", () => {
    expect(senderAddress("Anthropic <No-Reply@Mail.Anthropic.com>")).toBe("no-reply@mail.anthropic.com");
    expect(senderAddress("  Bills@Bank.com ")).toBe("bills@bank.com");
  });
});

describe("decideWithPreferences", () => {
  it("is the normal decision when there is no preference", () => {
    const base = decideWithPreferences(input(), noContext, {}, NOW);
    expect(base.matchedContext).toEqual([]);
  });
  it("raises a VIP sender through the same context mechanism, so it shows in the evidence", () => {
    const plain = decideWithPreferences(input(), noContext, {}, NOW);
    const vip = decideWithPreferences(input(), noContext, { "ravi@acme.com": "vip" }, NOW);
    expect(vip.scores.sender_importance).toBe(5);
    expect(vip.overallScore).toBeGreaterThan(plain.overallScore);
    expect(vip.matchedContext.some((m) => m.key === "ravi@acme.com" && m.importance === 5)).toBe(true);
  });
  it("files a muted sender as low priority and says why", () => {
    const urgent = input({ category: "FINANCIAL", intent: "ACTION_REQUIRED", requested_action: "pay", amount: 5000, deadline: "2026-10-09" });
    expect(decideWithPreferences(urgent, noContext, {}, NOW).level).toBe("ACT_NOW");
    const muted = decideWithPreferences(urgent, noContext, { "ravi@acme.com": "muted" }, NOW);
    expect(muted.level).toBe("LOW_PRIORITY");
    expect(muted.reason).toMatch(/^You muted this sender\./);
  });
  it("leaves already-quiet mail alone when muting", () => {
    const quiet = input({ category: "MARKETING", intent: "PROMOTION" });
    const before = decideWithPreferences(quiet, noContext, {}, NOW).level;
    expect(["LOW_PRIORITY", "NO_ACTION"]).toContain(before);
    expect(decideWithPreferences(quiet, noContext, { "ravi@acme.com": "muted" }, NOW).level).toBe(before);
  });
  it("only affects the matching sender", () => {
    const urgent = input({ category: "FINANCIAL", intent: "ACTION_REQUIRED", requested_action: "pay", amount: 5000, deadline: "2026-10-09", sender: "Zed <zed@else.com>" });
    expect(decideWithPreferences(urgent, noContext, { "ravi@acme.com": "muted" }, NOW).level).toBe("ACT_NOW");
  });
});
