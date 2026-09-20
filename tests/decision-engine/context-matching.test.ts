import { describe, expect, it } from "vitest";
import { findMatches, maxImportance } from "@/lib/decision-engine/context-matching";
import type { PersonalContextEntry } from "@/lib/context/types";

const NOW = new Date("2026-09-20T09:00:00.000Z").toISOString();

const context: PersonalContextEntry[] = [
  {
    id: "1",
    context_type: "IMPORTANT_ORGANIZATION",
    key: "Cisco",
    value: null,
    importance: 5,
    confidence: 1,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "2",
    context_type: "IMPORTANT_PERSON",
    key: "Priya Sharma",
    value: null,
    importance: 4,
    confidence: 1,
    created_at: NOW,
    updated_at: NOW,
  },
];

describe("findMatches", () => {
  it("matches case-insensitively", () => {
    const matches = findMatches(["cisco"], context);
    expect(matches).toHaveLength(1);
    expect(matches[0].entry.key).toBe("Cisco");
  });

  it("matches when the candidate contains the context key", () => {
    const matches = findMatches(["Priya Sharma (Manager)"], context);
    expect(matches.map((m) => m.entry.key)).toContain("Priya Sharma");
  });

  it("returns no matches when nothing overlaps", () => {
    const matches = findMatches(["Unrelated Person"], context);
    expect(matches).toHaveLength(0);
  });

  it("ignores null and empty candidates", () => {
    const matches = findMatches([null, undefined, "", "  "], context);
    expect(matches).toHaveLength(0);
  });
});

describe("maxImportance", () => {
  it("returns 0 when there are no matches", () => {
    expect(maxImportance([])).toBe(0);
  });

  it("returns the highest importance among matches", () => {
    const matches = findMatches(["Cisco", "Priya Sharma"], context);
    expect(maxImportance(matches)).toBe(5);
  });
});
