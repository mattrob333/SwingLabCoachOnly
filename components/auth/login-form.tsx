"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/coach/dashboard";

  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim(), password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const message = data.error ?? "Login failed";
        setError(message);
        showToast({
          title: "Login failed",
          description: message,
          variant: "error",
        });
        setLoading(false);
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      showToast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "error",
      });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-sm space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="slug" className="text-sm font-medium">
          Coach handle
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          autoComplete="username"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="e.g. marcus-reed"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="default" size="lg" disabled={loading} className="w-full">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-xs text-muted-foreground">
        MVP demo credential: handle <code>marcus-reed</code> · password{" "}
        <code>swinglab123</code>
      </p>
    </form>
  );
}
