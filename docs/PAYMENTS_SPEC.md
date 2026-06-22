# Payments Specification

**Status:** Wave 2 complete — Stripe Checkout + webhooks built (env-gated; mock until keys added).
**Last synced:** 2026-06-22

## Model
SwingLab is the platform; coaches monetize remote swing reviews. Payment **or a valid invite code** must clear **before** the coach is notified / before review (PRD guardrail).

## Adapter (built)
- `lib/payments/types.ts` — `PaymentAdapter` interface
- `lib/payments/mock-payment.ts` — synchronous confirm + `markPaid` (dev)
- `lib/payments/stripe-payment.ts` — fetch-based (no SDK); creates Checkout Sessions; HMAC-SHA256 webhook signature verification with 5-min tolerance
- `lib/payments/index.ts` — env-gated factory (live when `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` present)

## Flow
1. Parent selects review type → enters player info → uploads video.
2. `POST /api/submissions/[id]/pay`:
   - **live:** creates Stripe Checkout Session, returns `{ url }` for client redirect.
   - **mock:** synchronous confirm + `markSubmissionPaid`.
3. `POST /api/stripe/webhook`: verifies signature, handles `checkout.session.completed` → `markSubmissionPaid`. **Replay-safe** (idempotent on already-paid).
4. Submission becomes active → coach notified.

## Invite codes (built earlier)
- `lib/invite-codes.ts` + `POST /api/submissions/[id]/redeem-code` — free / discount / team codes; validated before activation.

## Earnings
- `lib/earnings.ts` + `app/coach/earnings` + `app/api/coach/earnings` — totals, paid vs free/team, platform fee, payout status.

## Pending
- Real Stripe Connect onboarding (coach connected accounts) when keys provisioned.
- Refund support (admin) — Wave 6.
