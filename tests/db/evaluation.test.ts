import { describe, expect, it } from "vitest";
import { mapEvaluationRow, type RawEvaluationRow } from "@/lib/db/evaluation";

const base: RawEvaluationRow = {
  communication_id: "comm-1",
  expected_category: "FINANCIAL",
  expected_intent: "ACTION_REQUIRED",
  expected_attention_level: "ACT_NOW",
  dataset_split: "test",
  communications: {
    subject: "Credit Card Payment Due Tomorrow",
    communication_analysis: { category: "FINANCIAL", intent: "ALERT" },
    attention_decisions: { level: "ACT_NOW" },
  },
};

describe("mapEvaluationRow", () => {
  // PostgREST embeds a to-one relationship (a table with a unique FK, like
  // communication_analysis/attention_decisions here) as a single object, not
  // an array — this was a real bug: the code assumed an array and always
  // read `undefined`, so /evaluation showed 0 analyzed no matter what.
  it("reads actual_category/intent/level when the join comes back as objects (to-one)", () => {
    const result = mapEvaluationRow(base);
    expect(result.actual_category).toBe("FINANCIAL");
    expect(result.actual_intent).toBe("ALERT");
    expect(result.actual_attention_level).toBe("ACT_NOW");
    expect(result.subject).toBe("Credit Card Payment Due Tomorrow");
  });

  it("also handles the join coming back as arrays (to-many shape)", () => {
    const arrayShaped: RawEvaluationRow = {
      ...base,
      communications: {
        subject: base.communications!.subject,
        communication_analysis: [{ category: "FINANCIAL", intent: "ALERT" }],
        attention_decisions: [{ level: "ACT_NOW" }],
      },
    };
    const result = mapEvaluationRow(arrayShaped);
    expect(result.actual_category).toBe("FINANCIAL");
    expect(result.actual_attention_level).toBe("ACT_NOW");
  });

  it("returns nulls for a communication that hasn't been analyzed yet", () => {
    const pending: RawEvaluationRow = {
      ...base,
      communications: {
        subject: base.communications!.subject,
        communication_analysis: null,
        attention_decisions: null,
      },
    };
    const result = mapEvaluationRow(pending);
    expect(result.actual_category).toBeNull();
    expect(result.actual_intent).toBeNull();
    expect(result.actual_attention_level).toBeNull();
  });

  it("falls back to '(unknown)' when the communications join itself is missing", () => {
    const result = mapEvaluationRow({ ...base, communications: null });
    expect(result.subject).toBe("(unknown)");
    expect(result.actual_category).toBeNull();
  });
});
