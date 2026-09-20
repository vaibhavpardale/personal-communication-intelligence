import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/config", () => ({
  config: {
    gmail: {
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      redirectUri: "http://localhost:3000/api/gmail/callback",
    },
  },
}));

import { buildAuthUrl, exchangeCodeForTokens, refreshAccessToken, GMAIL_SCOPE } from "@/lib/gmail/oauth";

describe("buildAuthUrl", () => {
  it("builds a Google OAuth URL with least-privilege readonly scope and required params", () => {
    const url = new URL(buildAuthUrl("abc123"));

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/gmail/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe(GMAIL_SCOPE);
    expect(url.searchParams.get("scope")).toContain("gmail.readonly");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("abc123");
  });
});

describe("exchangeCodeForTokens", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the authorization code and client credentials to Google's token endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "at-1",
        refresh_token: "rt-1",
        expires_in: 3600,
        scope: GMAIL_SCOPE,
        token_type: "Bearer",
      }),
    });

    const result = await exchangeCodeForTokens("auth-code-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init.body);
    expect(body.get("code")).toBe("auth-code-1");
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("client_secret")).toBe("test-client-secret");
    expect(body.get("grant_type")).toBe("authorization_code");

    expect(result.access_token).toBe("at-1");
    expect(result.refresh_token).toBe("rt-1");
  });

  it("throws with the response status and body when the exchange fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "invalid_grant",
    });

    await expect(exchangeCodeForTokens("bad-code")).rejects.toThrow(/400/);
  });
});

describe("refreshAccessToken", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the refresh token grant to Google's token endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "at-2",
        expires_in: 3600,
        scope: GMAIL_SCOPE,
        token_type: "Bearer",
      }),
    });

    const result = await refreshAccessToken("rt-1");

    const [, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init.body);
    expect(body.get("refresh_token")).toBe("rt-1");
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(result.access_token).toBe("at-2");
  });
});
