import { describe, it, expect, beforeEach } from "vitest";
import {
  getInviteCode,
  redeemInviteCode,
  INVITE_CODES,
} from "@/lib/invite-codes";

describe("getInviteCode", () => {
  it("finds a code case-insensitively", () => {
    expect(getInviteCode("swinglab-free")).toBeDefined();
    expect(getInviteCode("SWINGLAB-FREE")).toBeDefined();
  });

  it("returns undefined for a non-existent code", () => {
    expect(getInviteCode("NONEXISTENT")).toBeUndefined();
  });

  it("trims whitespace before lookup", () => {
    expect(getInviteCode("  SWINGLAB-FREE  ")).toBeDefined();
  });
});

describe("redeemInviteCode", () => {
  beforeEach(() => {
    // Reset redemptions
    const code = INVITE_CODES.find((c) => c.code === "SWINGLAB-FREE");
    if (code) code.redemptions = 0;
  });

  it("redeems a valid code for the correct coach", () => {
    const result = redeemInviteCode("SWINGLAB-FREE", "marcus-reed");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.inviteCode.redemptions).toBe(1);
    }
  });

  it("rejects a non-existent code", () => {
    const result = redeemInviteCode("FAKE-CODE", "marcus-reed");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Invalid invite code");
    }
  });

  it("rejects a code for the wrong coach", () => {
    const result = redeemInviteCode("SWINGLAB-FREE", "priya-anand");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("different coach");
    }
  });

  it("rejects a fully redeemed code", () => {
    const code = INVITE_CODES.find((c) => c.code === "SWINGLAB-FREE");
    if (code) code.redemptions = code.maxRedemptions;

    const result = redeemInviteCode("SWINGLAB-FREE", "marcus-reed");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("fully redeemed");
    }
  });

  it("increments redemptions on each successful redeem", () => {
    redeemInviteCode("SWINGLAB-FREE", "marcus-reed");
    const result = redeemInviteCode("SWINGLAB-FREE", "marcus-reed");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.inviteCode.redemptions).toBe(2);
    }
  });
});
