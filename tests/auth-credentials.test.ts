import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  verifyCoachCredentials,
  coachExists,
} from "@/lib/auth/credentials";

describe("password hashing", () => {
  it("hashPassword returns salt:hash format", () => {
    const stored = hashPassword("hunter2");
    const parts = stored.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0); // salt
    expect(parts[1].length).toBeGreaterThan(0); // hash
  });

  it("hashPassword with explicit salt is deterministic", () => {
    const a = hashPassword("hunter2", "abcd");
    const b = hashPassword("hunter2", "abcd");
    expect(a).toBe(b);
  });

  it("hashPassword uses different salts by default", () => {
    const a = hashPassword("hunter2");
    const b = hashPassword("hunter2");
    expect(a).not.toBe(b);
  });

  it("verifyPassword accepts the correct password", () => {
    const stored = hashPassword("correct-horse");
    expect(verifyPassword("correct-horse", stored)).toBe(true);
  });

  it("verifyPassword rejects the wrong password", () => {
    const stored = hashPassword("correct-horse");
    expect(verifyPassword("battery-staple", stored)).toBe(false);
  });

  it("verifyPassword rejects malformed stored values", () => {
    expect(verifyPassword("anything", "no-colon-here")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });
});

describe("coach credential store (MVP seed)", () => {
  it("coachExists returns true for seeded coach slugs", () => {
    expect(coachExists("marcus-reed")).toBe(true);
    expect(coachExists("priya-anand")).toBe(true);
  });

  it("coachExists returns false for unknown slug", () => {
    expect(coachExists("nobody")).toBe(false);
  });

  it("verifyCoachCredentials accepts the default MVP password", () => {
    expect(verifyCoachCredentials("marcus-reed", "swinglab123")).toBe(true);
  });

  it("verifyCoachCredentials rejects the wrong password", () => {
    expect(verifyCoachCredentials("marcus-reed", "wrong")).toBe(false);
  });

  it("verifyCoachCredentials rejects unknown coach", () => {
    expect(verifyCoachCredentials("ghost", "swinglab123")).toBe(false);
  });
});
