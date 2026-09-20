import { describe, expect, it, vi, beforeEach } from "vitest";

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }));

vi.mock("@/lib/ai/openai-client", () => ({
  getOpenAiClient: () => ({
    chat: { completions: { parse: parseMock } },
  }),
}));

import { generateExplanation } from "@/lib/ai/generate-explanation";
import { EXPLANATION_PROMPT_VERSION } from "@/lib/ai/prompts/communication-explanation-v1";

const baseInput = {
  subject: "Credit Card Payment Due Tomorrow",
  summary: "Credit card payment due tomorrow.",
  category: "FINANCIAL",
  intent: "ACTION_REQUIRED",
  organization: "HDFC Bank",
  deadline: "2026-09-21",
  eventDate: null,
  amount: 42500,
  currency: "INR",
  requestedAction: "Pay the credit card bill",
  attentionLevel: "ACT_NOW",
  decisionReason: "A communication where this requires action, and the deadline is today or tomorrow.",
  matchedContext: ["HDFC Bank (RECURRING_VENDOR, importance 3/5)"],
};

const validParsed = {
  why_it_matters: "Your HDFC Bank credit card payment of INR 42,500 is due tomorrow.",
  what_you_can_do: "Pay the credit card bill before the due date.",
};

beforeEach(() => {
  parseMock.mockReset();
});

describe("generateExplanation", () => {
  it("returns the parsed explanation, model, and prompt version on success", async () => {
    parseMock.mockResolvedValue({
      model: "gpt-4o-mini-2026-01-01",
      choices: [{ message: { parsed: validParsed, refusal: null } }],
    });

    const result = await generateExplanation(baseInput);

    expect(result.explanation).toEqual(validParsed);
    expect(result.model).toBe("gpt-4o-mini-2026-01-01");
    expect(result.promptVersion).toBe(EXPLANATION_PROMPT_VERSION);
  });

  it("grounds the prompt in only the provided facts (no other communications, no raw content)", async () => {
    parseMock.mockResolvedValue({
      model: "gpt-4o-mini",
      choices: [{ message: { parsed: validParsed, refusal: null } }],
    });

    await generateExplanation(baseInput);

    const call = parseMock.mock.calls[0][0];
    const userMessage = call.messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("42500");
    expect(userMessage.content).toContain("ACT_NOW");
    expect(userMessage.content).toContain("HDFC Bank (RECURRING_VENDOR, importance 3/5)");
  });

  it("throws when the model refuses to answer", async () => {
    parseMock.mockResolvedValue({
      model: "gpt-4o-mini",
      choices: [{ message: { parsed: null, refusal: "cannot process this" } }],
    });

    await expect(generateExplanation(baseInput)).rejects.toThrow(/refused/i);
  });

  it("throws when the response fails schema validation", async () => {
    parseMock.mockResolvedValue({
      model: "gpt-4o-mini",
      choices: [{ message: { parsed: undefined, refusal: null } }],
    });

    await expect(generateExplanation(baseInput)).rejects.toThrow(/schema/i);
  });
});
