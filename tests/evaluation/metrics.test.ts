import { describe, expect, it } from "vitest";
import {
  computeCategoryAccuracy,
  computeClassMetrics,
  computeDecisionAccuracy,
  computeIntentAccuracy,
  summarizeEvaluation,
  type EvaluationExample,
} from "@/lib/evaluation/metrics";

function example(overrides: Partial<EvaluationExample>): EvaluationExample {
  return {
    communication_id: "c1",
    expected_category: "FINANCIAL",
    expected_intent: "ACTION_REQUIRED",
    expected_attention_level: "ACT_NOW",
    actual_category: "FINANCIAL",
    actual_intent: "ACTION_REQUIRED",
    actual_attention_level: "ACT_NOW",
    ...overrides,
  };
}

describe("computeCategoryAccuracy / computeIntentAccuracy / computeDecisionAccuracy", () => {
  it("returns null when nothing has been evaluated yet", () => {
    const examples = [example({ actual_category: null, actual_intent: null, actual_attention_level: null })];
    expect(computeCategoryAccuracy(examples)).toBeNull();
    expect(computeIntentAccuracy(examples)).toBeNull();
    expect(computeDecisionAccuracy(examples)).toBeNull();
  });

  it("ignores pending (unanalyzed) examples in the denominator", () => {
    const examples = [
      example({ actual_category: "FINANCIAL" }), // correct
      example({ actual_category: null }), // pending, excluded
    ];
    expect(computeCategoryAccuracy(examples)).toBe(1);
  });

  it("computes fractional accuracy correctly", () => {
    const examples = [
      example({ actual_attention_level: "ACT_NOW" }), // correct
      example({ expected_attention_level: "REVIEW", actual_attention_level: "WATCH" }), // wrong
      example({ expected_attention_level: "NO_ACTION", actual_attention_level: "NO_ACTION" }), // correct
      example({ expected_attention_level: "WATCH", actual_attention_level: "LOW_PRIORITY" }), // wrong
    ];
    expect(computeDecisionAccuracy(examples)).toBe(0.5);
  });
});

describe("computeClassMetrics", () => {
  it("computes precision and recall for a class with mixed results", () => {
    const examples = [
      example({ expected_attention_level: "ACT_NOW", actual_attention_level: "ACT_NOW" }), // TP
      example({ expected_attention_level: "REVIEW", actual_attention_level: "ACT_NOW" }), // FP
      example({ expected_attention_level: "ACT_NOW", actual_attention_level: "REVIEW" }), // FN
      example({ expected_attention_level: "NO_ACTION", actual_attention_level: "NO_ACTION" }),
    ];

    const metrics = computeClassMetrics(examples, "ACT_NOW");
    // predicted ACT_NOW: 2 (1 correct, 1 wrong) -> precision 1/2
    expect(metrics.precision).toBe(0.5);
    // actual ACT_NOW: 2 (1 caught, 1 missed) -> recall 1/2
    expect(metrics.recall).toBe(0.5);
    expect(metrics.support).toBe(2);
  });

  it("returns null precision when the level was never predicted", () => {
    const examples = [example({ expected_attention_level: "ACT_NOW", actual_attention_level: "REVIEW" })];
    const metrics = computeClassMetrics(examples, "NO_ACTION");
    expect(metrics.precision).toBeNull();
    expect(metrics.recall).toBeNull();
    expect(metrics.support).toBe(0);
  });

  it("excludes unanalyzed (pending) examples entirely, so they don't count as missed", () => {
    const examples = [
      example({ expected_attention_level: "ACT_NOW", actual_attention_level: "ACT_NOW" }),
      example({ expected_attention_level: "ACT_NOW", actual_attention_level: null }),
    ];
    const metrics = computeClassMetrics(examples, "ACT_NOW");
    // Only 1 of the 2 ACT_NOW examples has been analyzed; recall is computed over that
    // evaluated subset (1/1), not penalized for the one still pending.
    expect(metrics.precision).toBe(1);
    expect(metrics.support).toBe(1);
    expect(metrics.recall).toBe(1);
  });
});

describe("summarizeEvaluation", () => {
  it("reports dataset size, evaluated/pending counts, and per-level metrics together", () => {
    const examples = [
      example({ expected_attention_level: "ACT_NOW", actual_attention_level: "ACT_NOW" }),
      example({ expected_attention_level: "NO_ACTION", actual_attention_level: null }),
    ];

    const summary = summarizeEvaluation(examples);

    expect(summary.totalDatasetSize).toBe(2);
    expect(summary.evaluatedCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.decisionAccuracy).toBe(1);
    expect(summary.perLevel.ACT_NOW.precision).toBe(1);
    // The NO_ACTION example is still pending (not yet analyzed), so it contributes 0 support.
    expect(summary.perLevel.NO_ACTION.support).toBe(0);
  });
});
