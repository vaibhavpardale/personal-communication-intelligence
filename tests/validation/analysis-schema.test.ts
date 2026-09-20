import { describe, expect, it } from "vitest";
import { analysisResultSchema } from "@/lib/validation/analysis-schema";

const validPayload = {
  category: "FINANCIAL",
  intent: "ACTION_REQUIRED",
  organization: "HDFC Bank",
  people: null,
  entities: ["credit card ending 4521"],
  event_date: null,
  deadline: "2026-09-21",
  amount: 42500,
  currency: "INR",
  product_service: null,
  reference_id: null,
  requested_action: "Pay the credit card bill before the due date",
  summary: "Credit card payment of INR 42,500 is due tomorrow.",
  confidence: 0.95,
};

describe("analysisResultSchema", () => {
  it("accepts a fully-populated valid payload", () => {
    const result = analysisResultSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts null for every nullable field", () => {
    const result = analysisResultSchema.safeParse({
      ...validPayload,
      organization: null,
      entities: null,
      deadline: null,
      amount: null,
      currency: null,
      product_service: null,
      reference_id: null,
      requested_action: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const withoutSummary: Record<string, unknown> = { ...validPayload };
    delete withoutSummary.summary;
    const result = analysisResultSchema.safeParse(withoutSummary);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid category not in the enum", () => {
    const result = analysisResultSchema.safeParse({ ...validPayload, category: "NOT_A_CATEGORY" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid intent not in the enum", () => {
    const result = analysisResultSchema.safeParse({ ...validPayload, intent: "NOT_AN_INTENT" });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside the 0-1 range", () => {
    const result = analysisResultSchema.safeParse({ ...validPayload, confidence: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed payload (wrong types)", () => {
    const result = analysisResultSchema.safeParse({ ...validPayload, amount: "42500" });
    expect(result.success).toBe(false);
  });
});
