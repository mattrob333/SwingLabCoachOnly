import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  signSession,
  verifySession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  type SessionPayload,
} from "@/lib/auth/session";

function makePayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  const now = Date.now();
  return {
    coachSlug: "marcus-reed",
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_MS,
    ...overrides,
  };
}

describe("session token sign/verify", () => {
  it("signSession returns body.signature format", () => {
    const token = signSession(makePayload());
    expect(token.split(".")).toHaveLength(2);
    expect(SESSION_COOKIE).toBe("swinglab_session");
  });

  it("verifySession accepts a freshly signed token", () => {
    const payload = makePayload();
    const token = signSession(payload);
    const result = verifySession(token);
    expect(result).not.toBeNull();
    expect(result?.coachSlug).toBe("marcus-reed");
  });

  it("verifySession rejects a tampered payload", () => {
    const token = signSession(makePayload());
    const [body, sig] = token.split(".");
    // Flip a character in the body
    const tamperedBody = body.charAt(0) === "A" ? "B" + body.slice(1) : "A" + body.slice(1);
    expect(verifySession(`${tamperedBody}.${sig}`)).toBeNull();
  });

  it("verifySession rejects a tampered signature", () => {
    const token = signSession(makePayload());
    const [body, sig] = token.split(".");
    const tamperedSig = sig.charAt(0) === "A" ? "B" + sig.slice(1) : "A" + sig.slice(1);
    expect(verifySession(`${body}.${tamperedSig}`)).toBeNull();
  });

  it("verifySession rejects a malformed token", () => {
    expect(verifySession("garbage")).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession("a.b.c")).toBeNull();
  });

  it("verifySession rejects an expired token", () => {
    const payload = makePayload({
      expiresAt: Date.now() - 1000, // expired 1s ago
    });
    const token = signSession(payload);
    expect(verifySession(token)).toBeNull();
  });

  it("verifySession rejects a token with unparseable payload", () => {
    // Build a token with valid signature over non-JSON body
    const body = Buffer.from("not-json").toString("base64url");
    const secret = process.env.SESSION_SECRET ?? "swinglab-dev-secret-change-me";
    const sig = createHmac("sha256", secret).update(body).digest("base64url");
    expect(verifySession(`${body}.${sig}`)).toBeNull();
  });
});
