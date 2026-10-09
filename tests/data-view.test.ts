import { describe, expect, it } from "vitest";
import { applyDataView, resolveView } from "@/lib/data-view";

const mail = [{ source: "gmail", id: 1 }, { source: "sample", id: 2 }, { source: "gmail", id: 3 }];

describe("applyDataView", () => {
  it("samples only hides every real message", () => {
    expect(applyDataView(mail, "sample").map((m) => m.id)).toEqual([2]);
  });
  it("real mail hides the samples, and all shows everything", () => {
    expect(applyDataView(mail, "real").map((m) => m.id)).toEqual([1, 3]);
    expect(applyDataView(mail, "all")).toHaveLength(3);
  });
});

describe("resolveView", () => {
  it("an explicit choice wins over everything else", () => {
    expect(resolveView("sample", "0", true)).toBe("sample");
    expect(resolveView("all", undefined, false)).toBe("all");
  });
  it("still honours the earlier on/off cookie", () => {
    expect(resolveView(undefined, "1", true)).toBe("all");
    expect(resolveView(undefined, "0", false)).toBe("real");
  });
  it("defaults to real mail when there is some, otherwise the samples", () => {
    expect(resolveView(undefined, undefined, true)).toBe("real");
    expect(resolveView(undefined, undefined, false)).toBe("sample");
  });
  it("ignores a junk cookie value", () => {
    expect(resolveView("bogus", undefined, true)).toBe("real");
  });
});
