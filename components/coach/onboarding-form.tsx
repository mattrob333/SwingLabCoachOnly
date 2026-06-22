"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type OnboardingData = {
  name: string;
  title: string;
  bio: string;
  location: string;
  priceUsd: string;
  turnaround: string;
  highlights: string;
};

const EMPTY: OnboardingData = {
  name: "",
  title: "",
  bio: "",
  location: "",
  priceUsd: "",
  turnaround: "PT24H",
  highlights: "",
};

const TURNAROUND_OPTIONS = [
  { value: "PT12H", label: "12 hours" },
  { value: "PT24H", label: "24 hours" },
  { value: "PT48H", label: "48 hours" },
  { value: "PT72H", label: "3 days" },
];

const STEPS = ["Profile", "Pricing", "Highlights"] as const;

export function OnboardingForm({
  initial,
}: {
  initial?: Partial<OnboardingData>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inline validation: check required fields for the current step.
  const stepValid =
    step === 0
      ? data.name.trim() !== "" && data.bio.trim() !== ""
      : step === 1
        ? data.priceUsd.trim() !== "" && Number(data.priceUsd) > 0
        : true;

  function update<K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K],
  ) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function next(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const highlights = data.highlights
      .split("\n")
      .map((h) => h.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/coach/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          title: data.title,
          bio: data.bio,
          location: data.location,
          priceUsd: Number(data.priceUsd),
          turnaround: data.turnaround,
          highlights,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          errors?: string[];
        };
        setError(
          body.errors?.join("; ") ?? body.error ?? "Failed to save profile",
        );
        setLoading(false);
        return;
      }

      router.push("/coach/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 text-muted-foreground">→</span>
            )}
          </div>
        ))}
      </div>

      <Card className="gap-0 p-6">
        <form onSubmit={step < STEPS.length - 1 ? next : submit} className="space-y-4">
        {step === 0 && (
          <>
            <Field
              id="name"
              label="Full name"
              required
              value={data.name}
              onChange={(v) => update("name", v)}
              placeholder="Jane Doe"
            />
            <Field
              id="title"
              label="Title / role"
              value={data.title}
              onChange={(v) => update("title", v)}
              placeholder="Hitting Coach · Former MiLB"
            />
            <Field
              id="location"
              label="Location"
              value={data.location}
              onChange={(v) => update("location", v)}
              placeholder="Austin, TX"
            />
            <TextArea
              id="bio"
              label="Bio"
              required
              value={data.bio}
              onChange={(v) => update("bio", v)}
              placeholder="Tell parents about your coaching background and approach…"
            />
          </>
        )}

        {step === 1 && (
          <>
            <Field
              id="priceUsd"
              label="Price per review (USD)"
              required
              type="number"
              value={data.priceUsd}
              onChange={(v) => update("priceUsd", v)}
              placeholder="49"
            />
            <div className="space-y-1.5">
              <label htmlFor="turnaround" className="text-sm font-medium">
                Turnaround time
              </label>
              <select
                id="turnaround"
                value={data.turnaround}
                onChange={(e) => update("turnaround", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {TURNAROUND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="highlights" className="text-sm font-medium">
                Profile highlights
              </label>
              <p className="text-xs text-muted-foreground">
                One per line. These appear on your public profile page.
              </p>
              <textarea
                id="highlights"
                value={data.highlights}
                onChange={(e) => update("highlights", e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder={"Voice-over video review in under 24 hours\nDrill plan tailored to each swing\nFollow-up check-in after 7 days"}
              />
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={back} disabled={loading}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button type="submit" variant="default" disabled={!stepValid}>
              Continue
            </Button>
          ) : (
            <Button type="submit" variant="default" disabled={loading}>
              {loading ? "Saving…" : "Save profile"}
            </Button>
          )}
        </div>

        {!stepValid && (
          <p className="text-xs text-muted-foreground">
            Please complete all required fields to continue.
          </p>
        )}
      </form>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <textarea
        id={id}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}
