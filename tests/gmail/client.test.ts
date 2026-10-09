import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const { refreshAccessTokenMock, updateGmailAccessTokenMock } = vi.hoisted(() => ({
  refreshAccessTokenMock: vi.fn(),
  updateGmailAccessTokenMock: vi.fn(),
}));

vi.mock("@/lib/gmail/oauth", () => ({
  refreshAccessToken: refreshAccessTokenMock,
}));

vi.mock("@/lib/db/gmail-connection", () => ({
  updateGmailAccessToken: updateGmailAccessTokenMock,
}));

import { buildMessageQuery, fetchMessages, getValidAccessToken, getProfileEmail } from "@/lib/gmail/client";
import type { GmailConnection } from "@/types/gmail";

const baseConnection: GmailConnection = {
  id: "conn-1",
  email: "user@gmail.com",
  access_token: "current-token",
  refresh_token: "refresh-token",
  token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
  scope: "https://www.googleapis.com/auth/gmail.readonly",
  connected_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  refreshAccessTokenMock.mockReset();
  updateGmailAccessTokenMock.mockReset();
});

describe("getValidAccessToken", () => {
  it("returns the current access token when it is not near expiry", async () => {
    const token = await getValidAccessToken(baseConnection);
    expect(token).toBe("current-token");
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });

  it("refreshes and persists a new access token when the current one is expired", async () => {
    refreshAccessTokenMock.mockResolvedValue({
      access_token: "new-token",
      expires_in: 3600,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      token_type: "Bearer",
    });

    const expired = { ...baseConnection, token_expires_at: new Date(Date.now() - 1000).toISOString() };
    const token = await getValidAccessToken(expired);

    expect(token).toBe("new-token");
    expect(refreshAccessTokenMock).toHaveBeenCalledWith("refresh-token");
    expect(updateGmailAccessTokenMock).toHaveBeenCalledWith("conn-1", "new-token", expect.any(String));
  });

  it("throws when the token is expired and there is no refresh token", async () => {
    const noRefresh = {
      ...baseConnection,
      refresh_token: null,
      token_expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    await expect(getValidAccessToken(noRefresh)).rejects.toThrow(/reconnect/i);
  });
});

describe("fetchMessages / getProfileEmail", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a bearer token and returns the profile email", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ emailAddress: "user@gmail.com" }) });

    const email = await getProfileEmail("token-1");

    expect(email).toBe("user@gmail.com");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/profile");
    expect(init.headers.Authorization).toBe("Bearer token-1");
  });

  const ok = (body: unknown) => ({ ok: true, json: async () => body });
  const query = "after:100 -in:sent";

  it("lists message ids then fetches each message in full", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ messages: [{ id: "m1" }, { id: "m2" }] }))
      .mockResolvedValueOnce(ok({ id: "m1", snippet: "first" }))
      .mockResolvedValueOnce(ok({ id: "m2", snippet: "second" }));

    const { messages, truncated } = await fetchMessages("token-1", { query, maxResults: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("q")).toBe(query);
    expect(messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(truncated).toBe(false);
  });

  it("follows pagination until there is no next page", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ messages: [{ id: "m1" }], nextPageToken: "p2" }))
      .mockResolvedValueOnce(ok({ messages: [{ id: "m2" }] }))
      .mockResolvedValue(ok({ id: "x" }));

    const { messages } = await fetchMessages("token-1", { query, maxResults: 10 });

    expect(fetchMock.mock.calls[1][0]).toContain("pageToken=p2");
    expect(messages).toHaveLength(2);
  });

  it("keeps the newest messages by default when over the cap, and reports truncation", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ messages: [{ id: "new" }, { id: "mid" }, { id: "old" }] }))
      .mockImplementation(async (url: string) => ok({ id: url.split("/messages/")[1].split("?")[0] }));

    const { messages, truncated } = await fetchMessages("token-1", { query, maxResults: 2 });

    expect(truncated).toBe(true);
    expect(messages.map((m) => m.id)).toEqual(["new", "mid"]);
  });

  it("keeps the oldest messages with keep: oldest, so an incremental sync can resume", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ messages: [{ id: "new" }, { id: "mid" }, { id: "old" }] }))
      .mockImplementation(async (url: string) => ok({ id: url.split("/messages/")[1].split("?")[0] }));

    const { messages } = await fetchMessages("token-1", { query, maxResults: 2, keep: "oldest" });

    expect(messages.map((m) => m.id)).toEqual(["mid", "old"]);
  });

  it("returns an empty result when there are no messages", async () => {
    fetchMock.mockResolvedValue(ok({}));
    const result = await fetchMessages("token-1", { query, maxResults: 10 });
    expect(result).toEqual({ messages: [], truncated: false });
  });

  it("throws with the status and body when a Gmail API call fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => "invalid_token" });
    await expect(getProfileEmail("bad-token")).rejects.toThrow(/401/);
  });
});

describe("buildMessageQuery", () => {
  it("builds epoch-second bounds and excludes sent mail and drafts", () => {
    const q = buildMessageQuery({ after: new Date(1_000_000_000_000), before: new Date(1_000_086_400_000) });
    expect(q).toBe("after:1000000000 before:1000086400 -in:sent -in:drafts");
  });

  it("omits before when the window is open-ended", () => {
    expect(buildMessageQuery({ after: new Date(5_000), before: null })).toBe("after:5 -in:sent -in:drafts");
  });
});
