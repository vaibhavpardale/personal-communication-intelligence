import { describe, expect, it, vi, beforeEach } from "vitest";

const { analyzeCommunicationMock, saveAnalysisMock, saveAttentionDecisionMock } = vi.hoisted(() => ({
  analyzeCommunicationMock: vi.fn(),
  saveAnalysisMock: vi.fn(),
  saveAttentionDecisionMock: vi.fn(),
}));

vi.mock("@/lib/ai/analyze-communication", () => ({
  analyzeCommunication: analyzeCommunicationMock,
}));

vi.mock("@/lib/db/communications", () => ({
  saveAnalysis: saveAnalysisMock,
}));

vi.mock("@/lib/db/attention", () => ({
  saveAttentionDecision: saveAttentionDecisionMock,
}));

import { processCommunication } from "@/lib/pipeline/process-communication";

const communication = {
  id: "comm-1",
  sender: "alerts@hdfcbank.com",
  sender_name: "HDFC Bank",
  subject: "Credit Card Payment Due Tomorrow",
  content: "Your payment of INR 42,500 is due tomorrow.",
  received_at: "2026-09-20T09:00:00.000Z",
};

const analysis = {
  category: "FINANCIAL",
  intent: "ACTION_REQUIRED",
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

const savedAnalysis = { id: "analysis-1", communication_id: "comm-1", ...analysis };
const savedAttention = {
  id: "attn-1",
  communication_id: "comm-1",
  level: "ACT_NOW",
  scores: {
    urgency: 5,
    action_required: 5,
    impact: 5,
    personal_relevance: 0,
    deadline_proximity: 5,
    sender_importance: 0,
  },
  overall_score: 3.85,
  reason: "A communication where this requires action, and the deadline is today or tomorrow.",
  matched_context: [],
  decision_version: "decision-engine-v1",
  created_at: "2026-09-20T09:00:00.000Z",
};

beforeEach(() => {
  analyzeCommunicationMock.mockReset();
  saveAnalysisMock.mockReset();
  saveAttentionDecisionMock.mockReset();
});

describe("processCommunication", () => {
  it("analyzes, decides attention, and persists both successfully", async () => {
    analyzeCommunicationMock.mockResolvedValue({
      analysis,
      model: "gpt-4o-mini",
      promptVersion: "communication-analysis-v1",
    });
    saveAnalysisMock.mockResolvedValue(savedAnalysis);
    saveAttentionDecisionMock.mockResolvedValue(savedAttention);

    const result = await processCommunication(communication);

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.analysis.id).toBe("analysis-1");
      expect(result.attention.level).toBe("ACT_NOW");
    }
    expect(saveAnalysisMock).toHaveBeenCalledWith(
      "comm-1",
      analysis,
      "gpt-4o-mini",
      "communication-analysis-v1",
    );
    expect(saveAttentionDecisionMock).toHaveBeenCalledTimes(1);
    const [communicationId, decision] = saveAttentionDecisionMock.mock.calls[0];
    expect(communicationId).toBe("comm-1");
    expect(decision.level).toBe("ACT_NOW");
  });

  it("passes personal context through to the decision engine", async () => {
    analyzeCommunicationMock.mockResolvedValue({
      analysis,
      model: "gpt-4o-mini",
      promptVersion: "communication-analysis-v1",
    });
    saveAnalysisMock.mockResolvedValue(savedAnalysis);
    saveAttentionDecisionMock.mockResolvedValue(savedAttention);

    const context = [
      {
        id: "ctx-1",
        context_type: "RECURRING_VENDOR" as const,
        key: "HDFC Bank",
        value: null,
        importance: 3,
        confidence: 1,
        created_at: "2026-09-20T00:00:00.000Z",
        updated_at: "2026-09-20T00:00:00.000Z",
      },
    ];

    await processCommunication(communication, context);

    const [, decision] = saveAttentionDecisionMock.mock.calls[0];
    expect(decision.scores.sender_importance).toBe(3);
  });

  it("returns an error result instead of throwing when the AI call fails", async () => {
    analyzeCommunicationMock.mockRejectedValue(new Error("OpenAI request timed out"));

    const result = await processCommunication(communication);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error).toMatch(/timed out/i);
    }
    expect(saveAnalysisMock).not.toHaveBeenCalled();
    expect(saveAttentionDecisionMock).not.toHaveBeenCalled();
  });

  it("returns an error result when analysis persistence fails", async () => {
    analyzeCommunicationMock.mockResolvedValue({
      analysis,
      model: "gpt-4o-mini",
      promptVersion: "communication-analysis-v1",
    });
    saveAnalysisMock.mockRejectedValue(new Error("db unavailable"));

    const result = await processCommunication(communication);

    expect(result.status).toBe("error");
    expect(saveAttentionDecisionMock).not.toHaveBeenCalled();
  });

  it("returns an error result when saving the attention decision fails", async () => {
    analyzeCommunicationMock.mockResolvedValue({
      analysis,
      model: "gpt-4o-mini",
      promptVersion: "communication-analysis-v1",
    });
    saveAnalysisMock.mockResolvedValue(savedAnalysis);
    saveAttentionDecisionMock.mockRejectedValue(new Error("db unavailable"));

    const result = await processCommunication(communication);

    expect(result.status).toBe("error");
  });
});
