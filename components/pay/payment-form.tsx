"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type PaymentFormProps = {
  submissionId: string;
  coachName: string;
  priceUsd: number;
};

export function PaymentForm({ submissionId, coachName, priceUsd }: PaymentFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"pay" | "code">("pay");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/submissions/${submissionId}/pay`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Payment failed");
        setLoading(false);
        return;
      }
      router.push(`/coach/submission/${submissionId}`);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  async function handleRedeem(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/submissions/${submissionId}/redeem-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Invalid code");
        setLoading(false);
        return;
      }
      router.push(`/coach/submission/${submissionId}`);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      {/* Toggle */}
      <div className="mb-6 flex rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setMode("pay")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            mode === "pay" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          Pay ${priceUsd}
        </button>
        <button
          type="button"
          onClick={() => setMode("code")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            mode === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          Have an invite code
        </button>
      </div>

      {mode === "pay" ? (
        <form onSubmit={handlePay} className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Coach</span>
              <span className="font-medium">{coachName}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Swing review</span>
              <span className="font-medium">${priceUsd}</span>
            </div>
            <div className="mt-3 border-t border-border pt-3 flex justify-between">
              <span className="font-medium">Total</span>
              <span className="text-lg font-semibold">${priceUsd}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Demo mode — no real charge. Stripe Connect integration lands in Phase 8.
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" variant="default" size="lg" disabled={loading} className="w-full">
            {loading ? "Processing…" : `Pay $${priceUsd}`}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRedeem} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="inviteCode" className="text-sm font-medium">
              Invite code
            </label>
            <input
              id="inviteCode"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="SWINGLAB-FREE"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <p className="text-xs text-muted-foreground">
              Enter your invite code for a comped review.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" variant="default" size="lg" disabled={loading} className="w-full">
            {loading ? "Redeeming…" : "Redeem code"}
          </Button>
        </form>
      )}
    </div>
  );
}
