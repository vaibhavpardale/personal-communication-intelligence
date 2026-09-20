import { describe, expect, it } from "vitest";
import { decideAttention } from "@/lib/decision-engine/decide";
import type { DecisionEngineInput } from "@/lib/decision-engine/types";
import type { PersonalContextEntry } from "@/lib/context/types";

const NOW = new Date("2026-09-20T09:00:00.000Z");

function contextEntry(overrides: Partial<PersonalContextEntry>): PersonalContextEntry {
  return {
    id: "ctx-1",
    context_type: "IMPORTANT_ORGANIZATION",
    key: "Cisco",
    value: null,
    importance: 5,
    confidence: 1,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

function baseInput(overrides: Partial<DecisionEngineInput>): DecisionEngineInput {
  return {
    category: "OTHER",
    intent: "INFORMATION",
    organization: null,
    people: null,
    entities: null,
    product_service: null,
    deadline: null,
    event_date: null,
    amount: null,
    requested_action: null,
    sender: "no-reply@example.com",
    sender_name: null,
    ...overrides,
  };
}

function daysFromNow(days: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("decideAttention", () => {
  it("classifies an urgent payment due tomorrow as ACT_NOW", () => {
    const input = baseInput({
      category: "FINANCIAL",
      intent: "ACTION_REQUIRED",
      organization: "HDFC Bank",
      amount: 42500,
      deadline: daysFromNow(1),
      requested_action: "Pay the credit card bill before the due date",
    });

    const result = decideAttention(input, [], NOW);

    expect(result.level).toBe("ACT_NOW");
    expect(result.scores.action_required).toBe(5);
    expect(result.scores.deadline_proximity).toBe(5);
    expect(result.reason).toMatch(/requires action/i);
  });

  it("classifies an important-but-not-urgent work alert as REVIEW", () => {
    const input = baseInput({
      category: "WORK",
      intent: "ALERT",
      organization: "Acme Corp",
      requested_action: "Please review and respond",
      event_date: daysFromNow(6),
    });
    const context = [contextEntry({ context_type: "IMPORTANT_ORGANIZATION", key: "Acme Corp", importance: 5 })];

    const result = decideAttention(input, context, NOW);

    expect(result.level).toBe("REVIEW");
    expect(result.scores.sender_importance).toBe(5);
  });

  it("classifies a future event worth monitoring as WATCH", () => {
    const input = baseInput({
      category: "SUBSCRIPTION",
      intent: "REMINDER",
      product_service: "Netflix",
      event_date: daysFromNow(3),
    });

    const result = decideAttention(input, [], NOW);

    expect(result.level).toBe("WATCH");
  });

  it("classifies a low-relevance work FYI as LOW_PRIORITY", () => {
    const input = baseInput({
      category: "WORK",
      intent: "UPDATE",
    });

    const result = decideAttention(input, [], NOW);

    expect(result.level).toBe("LOW_PRIORITY");
  });

  it("classifies a generic promotional newsletter as NO_ACTION", () => {
    const input = baseInput({
      category: "MARKETING",
      intent: "PROMOTION",
    });

    const result = decideAttention(input, [], NOW);

    expect(result.level).toBe("NO_ACTION");
    expect(result.reason).toBe("No specific action or meaningful personal relevance was identified.");
  });

  it("increases personal relevance and overall score when an important person is mentioned", () => {
    const withoutContext = decideAttention(
      baseInput({ category: "WORK", intent: "INFORMATION", people: ["Priya Sharma"] }),
      [],
      NOW,
    );
    const withContext = decideAttention(
      baseInput({ category: "WORK", intent: "INFORMATION", people: ["Priya Sharma"] }),
      [contextEntry({ context_type: "IMPORTANT_PERSON", key: "Priya Sharma", importance: 5 })],
      NOW,
    );

    expect(withContext.scores.personal_relevance).toBeGreaterThan(withoutContext.scores.personal_relevance);
    expect(withContext.overallScore).toBeGreaterThan(withoutContext.overallScore);
  });

  it("increases deadline_proximity score as the deadline gets closer", () => {
    const far = decideAttention(baseInput({ deadline: daysFromNow(20) }), [], NOW);
    const soon = decideAttention(baseInput({ deadline: daysFromNow(2) }), [], NOW);
    const tomorrow = decideAttention(baseInput({ deadline: daysFromNow(1) }), [], NOW);

    expect(soon.scores.deadline_proximity).toBeGreaterThan(far.scores.deadline_proximity);
    expect(tomorrow.scores.deadline_proximity).toBeGreaterThan(soon.scores.deadline_proximity);
  });

  it("treats an overdue deadline with the same urgency as due-tomorrow", () => {
    const overdue = decideAttention(baseInput({ deadline: daysFromNow(-3) }), [], NOW);
    expect(overdue.scores.deadline_proximity).toBe(5);
  });

  it("records which personal context entries were matched, and where", () => {
    const input = baseInput({
      organization: "Cisco",
      people: ["Priya Sharma"],
    });
    const context = [
      contextEntry({ context_type: "IMPORTANT_ORGANIZATION", key: "Cisco", importance: 5 }),
      contextEntry({ context_type: "IMPORTANT_PERSON", key: "Priya Sharma", importance: 4 }),
    ];

    const result = decideAttention(input, context, NOW);

    expect(result.matchedContext).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "Cisco", matched_on: "sender" }),
        expect.objectContaining({ key: "Priya Sharma", matched_on: "content" }),
      ]),
    );
  });

  it("is a pure function: same input and context always produce the same result", () => {
    const input = baseInput({ category: "FINANCIAL", intent: "ACTION_REQUIRED", amount: 500, deadline: daysFromNow(5) });
    const a = decideAttention(input, [], NOW);
    const b = decideAttention(input, [], NOW);
    expect(a).toEqual(b);
  });
});
