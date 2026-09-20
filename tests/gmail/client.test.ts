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

import { fetchRecentMessages, getValidAccessToken, getProfileEmail } from "@/lib/gmail/client";
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

describe("fetchRecentMessages / getProfileEmail", () => {
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

  it("lists message ids then fetches each message in full", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [{ id: "m1" }, { id: "m2" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "m1", snippet: "first" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "m2", snippet: "second" }) });

    const messages = await fetchRecentMessages("token-1", 2);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain("maxResults=2");
    expect(messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("returns an empty array when there are no messages", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const messages = await fetchRecentMessages("token-1");
    expect(messages).toEqual([]);
  });

  it("throws with the status and body when a Gmail API call fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => "invalid_token" });
    await expect(getProfileEmail("bad-token")).rejects.toThrow(/401/);
  });
});
