import { describe, expect, it } from "vitest";
import { suggestPreferences, type LearningRow } from "@/lib/learning";

const row = (over: Partial<LearningRow> = {}): LearningRow => ({
  sender: "Promo <promo@shop.com>",
  senderName: "Promo",
  status: "unread",
  level: "WATCH",
  feedback: [],
  ...over,
});

describe("suggestPreferences", () => {
  it("suggests muting a sender the user keeps hiding, while Heed still shows their mail", () => {
    const out = suggestPreferences([row({ status: "hidden" }), row({ status: "hidden" }), row()], {});
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ sender: "promo@shop.com", kind: "mute", evidence: 2, name: "Promo" });
    expect(out[0].reason).toBe("You hid 2 messages from this sender.");
  });
  it("counts not-important feedback too, and says so in plain words", () => {
    const out = suggestPreferences([row({ feedback: ["NOT_IMPORTANT"] }), row({ feedback: ["DISMISS"] })], {});
    expect(out[0].reason).toBe("You marked 2 not important from this sender.");
  });
  it("does not suggest muting when Heed already files everything from them as noise", () => {
    expect(suggestPreferences([row({ status: "hidden", level: "NO_ACTION" }), row({ status: "hidden", level: "LOW_PRIORITY" })], {})).toEqual([]);
  });
  it("needs at least two data points", () => {
    expect(suggestPreferences([row({ status: "hidden" })], {})).toEqual([]);
  });
  it("never suggests muting a sender the user has also marked important", () => {
    const out = suggestPreferences([row({ status: "hidden" }), row({ status: "hidden" }), row({ feedback: ["IMPORTANT"] })], {});
    expect(out.find((s) => s.kind === "mute")).toBeUndefined();
  });
  it("suggests a VIP when the user marks messages important or handles their urgent ones", () => {
    const out = suggestPreferences(
      [row({ sender: "boss@work.com", feedback: ["IMPORTANT"] }), row({ sender: "boss@work.com", status: "read", level: "REVIEW" })],
      {},
    );
    expect(out[0]).toMatchObject({ sender: "boss@work.com", kind: "vip", evidence: 2 });
    expect(out[0].reason).toBe("You marked 1 important and handled 1 urgent message from this sender.");
  });
  it("skips senders that already have a preference and ranks by evidence", () => {
    const rows = [
      ...Array.from({ length: 3 }, () => row({ sender: "a@x.com", status: "hidden" })),
      ...Array.from({ length: 2 }, () => row({ sender: "b@x.com", status: "hidden" })),
      ...Array.from({ length: 4 }, () => row({ sender: "c@x.com", status: "hidden" })),
      row({ sender: "a@x.com" }),
      row({ sender: "b@x.com" }),
      row({ sender: "c@x.com" }),
    ];
    expect(suggestPreferences(rows, { "c@x.com": "muted" }).map((s) => s.sender)).toEqual(["a@x.com", "b@x.com"]);
  });
});
