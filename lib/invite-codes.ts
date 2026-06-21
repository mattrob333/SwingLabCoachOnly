/**
 * Phase 3 — Invite code model (in-memory store for MVP).
 *
 * Invite codes allow coaches or admins to comp a free review. When a parent
 * redeems a valid code for their submission's coach, the submission is marked
 * as paid without a real payment.
 */

export type InviteCode = {
  code: string;
  coachSlug: string;
  maxRedemptions: number;
  redemptions: number;
  createdAt: Date;
};

/** In-memory store. Seeded with a demo code for MVP. */
export const INVITE_CODES: InviteCode[] = [
  {
    code: "SWINGLAB-FREE",
    coachSlug: "marcus-reed",
    maxRedemptions: 10,
    redemptions: 0,
    createdAt: new Date("2026-06-21"),
  },
];

/**
 * Look up an invite code. Returns `undefined` when not found.
 */
export function getInviteCode(code: string): InviteCode | undefined {
  return INVITE_CODES.find(
    (c) => c.code.toLowerCase() === code.trim().toLowerCase(),
  );
}

/**
 * Validate + redeem an invite code for a given coach slug.
 * Returns `{ ok: true }` on success or `{ ok: false, error }` on failure.
 *
 * Rules:
 * - Code must exist.
 * - Code must be for the same coach as the submission.
 * - Code must have remaining redemptions.
 */
export function redeemInviteCode(
  code: string,
  coachSlug: string,
): { ok: true; inviteCode: InviteCode } | { ok: false; error: string } {
  const invite = getInviteCode(code);
  if (!invite) {
    return { ok: false, error: "Invalid invite code" };
  }
  if (invite.coachSlug !== coachSlug) {
    return { ok: false, error: "This invite code is for a different coach" };
  }
  if (invite.redemptions >= invite.maxRedemptions) {
    return { ok: false, error: "This invite code has been fully redeemed" };
  }

  invite.redemptions += 1;
  return { ok: true, inviteCode: invite };
}
