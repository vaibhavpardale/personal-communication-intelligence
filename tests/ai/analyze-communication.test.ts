import { describe, expect, it, vi, beforeEach } from "vitest";

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }));

vi.mock("@/lib/ai/openai-client", () => ({
  getOpenAiClient: () => ({
    chat: { completions: { parse: parseMock } },
  }),
}));

import { analyzeCommunication } from "@/lib/ai/analyze-communication";
import { PROMPT_VERSION } from "@/lib/ai/prompts/communication-analysis-v1";

const baseInput = {
  sender: "alerts@hdfcbank.com",
  sender_name: "HDFC Bank",
  subject: "Credit Card Payment Due Tomorrow",
  content: "Your payment of INR 42,500 is due tomorrow.",
  received_at: "2026-09-20T09:00:00.000Z",
};

const validParsed = {
  category: "FINANCIAL" as const,
  intent: "ACTION_REQUIRED" as const,
  organization: "HDFC Bank",
  people: null,
  entities: null,
  event_date: null,
  deadline: "2026-09-21",
  amount: 42500,
  currency: "INR",
  product_service: null,
  reference_id: null,
  requested_action: "Pay the credit card bill",
  summary: "Credit card payment due tomorrow.",
  confidence: 0.95,
};

beforeEach(() => {
  parseMock.mockReset();
});

describe("analyzeCommunication", () => {
  it("returns the parsed analysis, model, and prompt version on success", async () => {
    parseMock.mockResolvedValue({
      model: "gpt-4o-mini-2026-01-01",
      choices: [{ message: { parsed: validParsed, refusal: null } }],
    });

    const result = await analyzeCommunication(baseInput);

    expect(result.analysis).toEqual(validParsed);
    expect(result.model).toBe("gpt-4o-mini-2026-01-01");
    expect(result.promptVersion).toBe(PROMPT_VERSION);
  });

  it("includes the subject and content in the prompt sent to the model", async () => {
    parseMock.mockResolvedValue({
      model: "gpt-4o-mini",
      choices: [{ message: { parsed: validParsed, refusal: null } }],
    });

    await analyzeCommunication(baseInput);

    const call = parseMock.mock.calls[0][0];
    const userMessage = call.messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain(baseInput.subject);
    expect(userMessage.content).toContain(baseInput.content);
  });

  it("throws when the model refuses to answer", async () => {
    parseMock.mockResolvedValue({
      model: "gpt-4o-mini",
      choices: [{ message: { parsed: null, refusal: "cannot process this" } }],
    });

    await expect(analyzeCommunication(baseInput)).rejects.toThrow(/refused/i);
  });

  it("throws when the response fails schema validation (no parsed result)", async () => {
    parseMock.mockResolvedValue({
      model: "gpt-4o-mini",
      choices: [{ message: { parsed: undefined, refusal: null } }],
    });

    await expect(analyzeCommunication(baseInput)).rejects.toThrow(/schema/i);
  });
});
