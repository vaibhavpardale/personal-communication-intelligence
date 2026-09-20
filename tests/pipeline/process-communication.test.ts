import { describe, expect, it, vi, beforeEach } from "vitest";

const { analyzeCommunicationMock, saveAnalysisMock } = vi.hoisted(() => ({
  analyzeCommunicationMock: vi.fn(),
  saveAnalysisMock: vi.fn(),
}));

vi.mock("@/lib/ai/analyze-communication", () => ({
  analyzeCommunication: analyzeCommunicationMock,
}));

vi.mock("@/lib/db/communications", () => ({
  saveAnalysis: saveAnalysisMock,
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

beforeEach(() => {
  analyzeCommunicationMock.mockReset();
  saveAnalysisMock.mockReset();
});

describe("processCommunication", () => {
  it("analyzes and persists successfully", async () => {
    analyzeCommunicationMock.mockResolvedValue({
      analysis,
      model: "gpt-4o-mini",
      promptVersion: "communication-analysis-v1",
    });
    saveAnalysisMock.mockResolvedValue({ id: "analysis-1", communication_id: "comm-1", ...analysis });

    const result = await processCommunication(communication);

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.analysis.id).toBe("analysis-1");
    }
    expect(saveAnalysisMock).toHaveBeenCalledWith(
      "comm-1",
      analysis,
      "gpt-4o-mini",
      "communication-analysis-v1",
    );
  });

  it("returns an error result instead of throwing when the AI call fails", async () => {
    analyzeCommunicationMock.mockRejectedValue(new Error("OpenAI request timed out"));

    const result = await processCommunication(communication);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error).toMatch(/timed out/i);
    }
    expect(saveAnalysisMock).not.toHaveBeenCalled();
  });

  it("returns an error result when persistence fails", async () => {
    analyzeCommunicationMock.mockResolvedValue({
      analysis,
      model: "gpt-4o-mini",
      promptVersion: "communication-analysis-v1",
    });
    saveAnalysisMock.mockRejectedValue(new Error("db unavailable"));

    const result = await processCommunication(communication);

    expect(result.status).toBe("error");
  });
});
