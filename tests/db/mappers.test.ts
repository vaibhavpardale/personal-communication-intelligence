import { describe, expect, it } from "vitest";
import { toAnalysisInsertRow } from "@/lib/db/mappers";
import type { AnalysisResult } from "@/lib/validation/analysis-schema";

const analysis: AnalysisResult = {
  category: "TRAVEL",
  intent: "ALERT",
  organization: "IndiGo Airlines",
  people: null,
  entities: ["PNR XY7KQP"],
  event_date: "2026-09-26",
  deadline: null,
  amount: null,
  currency: null,
  product_service: null,
  reference_id: "XY7KQP",
  requested_action: "Check the updated itinerary before travelling",
  summary: "Flight 6E-204 departure time has changed.",
  confidence: 0.9,
};

describe("toAnalysisInsertRow", () => {
  it("maps a validated AI result plus provenance into a DB row", () => {
    const row = toAnalysisInsertRow("comm-123", analysis, "gpt-4o-mini", "communication-analysis-v1");

    expect(row).toEqual({
      communication_id: "comm-123",
      category: "TRAVEL",
      intent: "ALERT",
      organization: "IndiGo Airlines",
      people: null,
      entities: ["PNR XY7KQP"],
      event_date: "2026-09-26",
      deadline: null,
      amount: null,
      currency: null,
      product_service: null,
      reference_id: "XY7KQP",
      requested_action: "Check the updated itinerary before travelling",
      summary: "Flight 6E-204 departure time has changed.",
      confidence: 0.9,
      model: "gpt-4o-mini",
      prompt_version: "communication-analysis-v1",
    });
  });

  it("never invents a communication id, model, or prompt version", () => {
    const row = toAnalysisInsertRow("another-id", analysis, "gpt-5", "communication-analysis-v2");
    expect(row.communication_id).toBe("another-id");
    expect(row.model).toBe("gpt-5");
    expect(row.prompt_version).toBe("communication-analysis-v2");
  });
});
