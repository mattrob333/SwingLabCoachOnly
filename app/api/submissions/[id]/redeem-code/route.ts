import { NextRequest, NextResponse } from "next/server";
import { getSubmissionById, markSubmissionPaid } from "@/lib/submissions";
import { redeemInviteCode } from "@/lib/invite-codes";

/**
 * Phase 3 — Redeem an invite code for a submission.
 *
 * POST /api/submissions/[id]/redeem-code
 * Body: { code: string }
 *
 * If the code is valid for the submission's coach, the submission is marked
 * as paid (comped) without a real payment.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const submission = getSubmissionById(id);

  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  if (submission.status !== "pending_payment") {
    return NextResponse.json(
      { error: `Submission is already ${submission.status}` },
      { status: 409 },
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = String(body.code ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { error: "Invite code is required" },
      { status: 422 },
    );
  }

  const result = redeemInviteCode(code, submission.coachSlug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  try {
    const updated = markSubmissionPaid(id);
    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      comped: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to redeem code" },
      { status: 500 },
    );
  }
}
