import { describe, expect, it } from "vitest";
import { extractMessageContent, normalizeGmailMessage } from "@/lib/gmail/normalize";
import type { GmailApiMessage } from "@/lib/gmail/client";

function b64url(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64url");
}

describe("normalizeGmailMessage", () => {
  it("extracts sender, subject, and received date from headers, and maps into the Communication model", () => {
    const message: GmailApiMessage = {
      id: "msg-123",
      internalDate: "1758355200000",
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "From", value: '"HDFC Bank" <alerts@hdfcbank.com>' },
          { name: "Subject", value: "Credit Card Payment Due Tomorrow" },
          { name: "Date", value: "Sun, 20 Sep 2026 09:00:00 +0000" },
        ],
        body: { data: b64url("Your payment of INR 42,500 is due tomorrow.") },
      },
    };

    const communication = normalizeGmailMessage(message);

    expect(communication.source).toBe("gmail");
    expect(communication.source_type).toBe("email");
    expect(communication.sender).toBe("alerts@hdfcbank.com");
    expect(communication.sender_name).toBe("HDFC Bank");
    expect(communication.subject).toBe("Credit Card Payment Due Tomorrow");
    expect(communication.content).toBe("Your payment of INR 42,500 is due tomorrow.");
    expect(communication.received_at).toBe(new Date("2026-09-20T09:00:00.000Z").toISOString());
    expect(communication.external_id).toBe("msg-123");
  });

  it("falls back to the internalDate when there is no Date header", () => {
    const message: GmailApiMessage = {
      id: "msg-2",
      internalDate: "1700000000000",
      payload: {
        headers: [{ name: "From", value: "no-reply@example.com" }],
        body: { data: b64url("hello") },
      },
    };

    const communication = normalizeGmailMessage(message);
    expect(communication.received_at).toBe(new Date(1700000000000).toISOString());
  });

  it("handles a From header with no display name", () => {
    const message: GmailApiMessage = {
      id: "msg-3",
      payload: { headers: [{ name: "From", value: "plain@example.com" }] },
    };

    const communication = normalizeGmailMessage(message);
    expect(communication.sender).toBe("plain@example.com");
    expect(communication.sender_name).toBeNull();
  });
});

describe("extractMessageContent", () => {
  it("prefers a text/plain part over text/html when both exist", () => {
    const message: GmailApiMessage = {
      id: "msg-4",
      payload: {
        mimeType: "multipart/alternative",
        parts: [
          { mimeType: "text/html", body: { data: b64url("<p>HTML body</p>") } },
          { mimeType: "text/plain", body: { data: b64url("Plain body") } },
        ],
      },
    };

    expect(extractMessageContent(message)).toBe("Plain body");
  });

  it("strips tags and scripts from HTML when no plain-text part exists", () => {
    const message: GmailApiMessage = {
      id: "msg-5",
      payload: {
        mimeType: "text/html",
        body: {
          data: b64url("<style>.a{color:red}</style><p>Hello <b>World</b></p><script>evil()</script>"),
        },
      },
    };

    expect(extractMessageContent(message)).toBe("Hello World");
  });

  it("recurses into nested multipart parts to find the text content", () => {
    const message: GmailApiMessage = {
      id: "msg-6",
      payload: {
        mimeType: "multipart/mixed",
        parts: [
          {
            mimeType: "multipart/alternative",
            parts: [{ mimeType: "text/plain", body: { data: b64url("Nested plain text") } }],
          },
        ],
      },
    };

    expect(extractMessageContent(message)).toBe("Nested plain text");
  });

  it("falls back to the snippet when there is no usable body", () => {
    const message: GmailApiMessage = { id: "msg-7", snippet: "Preview text only" };
    expect(extractMessageContent(message)).toBe("Preview text only");
  });

  it("truncates very long content to a bounded length", () => {
    const longText = "a".repeat(10_000);
    const message: GmailApiMessage = {
      id: "msg-8",
      payload: { mimeType: "text/plain", body: { data: b64url(longText) } },
    };

    expect(extractMessageContent(message).length).toBe(5000);
  });
});
