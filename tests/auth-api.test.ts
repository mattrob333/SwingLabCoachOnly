import { describe, it, expect, beforeEach } from "vitest";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  verifySession,
} from "@/lib/auth/session";
import { DEFAULT_MVP_PASSWORD } from "@/lib/auth/credentials";

// Helper: build a Request-like object with a JSON body.
function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Helper: build a Request whose .json() throws (simulates malformed body).
function makeMalformedRequest(): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json {{{",
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    // Ensure clean process.env for cookie secure flag tests
    delete process.env.NODE_ENV;
  });

  it("returns 400 on malformed JSON body", async () => {
    const res = await loginPOST(makeMalformedRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid json/i);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await loginPOST(
      makeJsonRequest({ password: DEFAULT_MVP_PASSWORD }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/slug.*required|required/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await loginPOST(makeJsonRequest({ slug: "marcus-reed" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/password.*required|required/i);
  });

  it("returns 400 when both slug and password are missing", async () => {
    const res = await loginPOST(makeJsonRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty-string slug (trimmed to empty)", async () => {
    const res = await loginPOST(
      makeJsonRequest({ slug: "   ", password: DEFAULT_MVP_PASSWORD }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 for an unknown slug with the same message as a bad password", async () => {
    const res = await loginPOST(
      makeJsonRequest({ slug: "nonexistent-coach", password: "somepassword" }),
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid credentials/i);
  });

  it("returns 401 for a wrong password", async () => {
    const res = await loginPOST(
      makeJsonRequest({ slug: "marcus-reed", password: "wrongpassword" }),
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid credentials/i);
  });

  it("does not leak which slugs exist — unknown slug and wrong password return identical error", async () => {
    const unknownRes = await loginPOST(
      makeJsonRequest({ slug: "nonexistent-coach", password: "x" }),
    );
    const wrongPassRes = await loginPOST(
      makeJsonRequest({ slug: "marcus-reed", password: "x" }),
    );
    expect(unknownRes.status).toBe(wrongPassRes.status);
    const unknownData = await unknownRes.json();
    const wrongPassData = await wrongPassRes.json();
    expect(unknownData).toEqual(wrongPassData);
  });

  it("returns 200 and sets a session cookie for valid credentials", async () => {
    const res = await loginPOST(
      makeJsonRequest({ slug: "marcus-reed", password: DEFAULT_MVP_PASSWORD }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.slug).toBe("marcus-reed");

    // Verify the cookie is set
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
  });

  it("sets the session cookie with correct security attributes", async () => {
    const res = await loginPOST(
      makeJsonRequest({ slug: "marcus-reed", password: DEFAULT_MVP_PASSWORD }),
    );
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie).toContain("Path=/");
    // maxAge should match SESSION_MAX_AGE_MS (in seconds)
    const expectedMaxAge = Math.floor(SESSION_MAX_AGE_MS / 1000);
    expect(setCookie).toContain(`Max-Age=${expectedMaxAge}`);
  });

  it("sets Secure flag when NODE_ENV is production", async () => {
    process.env.NODE_ENV = "production";
    const res = await loginPOST(
      makeJsonRequest({ slug: "marcus-reed", password: DEFAULT_MVP_PASSWORD }),
    );
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("Secure");
  });

  it("does not set Secure flag when NODE_ENV is development", async () => {
    process.env.NODE_ENV = "development";
    const res = await loginPOST(
      makeJsonRequest({ slug: "marcus-reed", password: DEFAULT_MVP_PASSWORD }),
    );
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toContain("Secure");
  });

  it("the issued session token is verifiable and contains the correct slug", async () => {
    const res = await loginPOST(
      makeJsonRequest({ slug: "marcus-reed", password: DEFAULT_MVP_PASSWORD }),
    );
    const setCookie = res.headers.get("set-cookie") ?? "";
    // Extract the token value from "swinglab_session=<token>; HttpOnly; ..."
    const match = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    expect(match).toBeTruthy();
    const token = match![1];
    const payload = verifySession(token);
    expect(payload).not.toBeNull();
    expect(payload!.coachSlug).toBe("marcus-reed");
  });

  it("trims the slug before verifying (whitespace-padded slug works)", async () => {
    const res = await loginPOST(
      makeJsonRequest({
        slug: "  marcus-reed  ",
        password: DEFAULT_MVP_PASSWORD,
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slug).toBe("marcus-reed");
  });
});

describe("POST /api/auth/logout", () => {
  it("returns a redirect response", async () => {
    const res = await logoutPOST();
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
  });

  it("clears the session cookie by setting maxAge to 0", async () => {
    const res = await logoutPOST();
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain("Max-Age=0");
  });

  it("sets correct security attributes on the cleared cookie", async () => {
    const res = await logoutPOST();
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie).toContain("Path=/");
  });
});
