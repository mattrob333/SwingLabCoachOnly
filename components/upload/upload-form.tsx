"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast";
import type { Coach } from "@/lib/coaches";

type UploadFormProps = {
  coaches: Pick<Coach, "slug" | "name" | "priceUsd" | "turnaround">[];
  /**
   * Optional — when set, this upload is a follow-up to a previous lesson.
   * The id is forwarded to the submissions API and links the new submission
   * to the original (PRD §31 build order #17).
   */
  followUpFor?: string;
};

export function UploadForm({ coaches, followUpFor }: UploadFormProps) {
  const [coachSlug, setCoachSlug] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [playerAge, setPlayerAge] = useState("");
  const [swingType, setSwingType] = useState("baseball");
  const [notes, setNotes] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    id: string;
    coachName: string;
  } | null>(null);

  const selectedCoach = coaches.find((c) => c.slug === coachSlug);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setVideoFile(file);
    setUploadProgress(0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!coachSlug) {
      setError("Please select a coach.");
      return;
    }
    if (!videoFile) {
      setError("Please select a video file to upload.");
      return;
    }

    setLoading(true);
    setUploadProgress(10);

    // Simulate upload progress (actual file storage lands with the render
    // pipeline in Phase 5). For MVP we create the submission record and
    // show progress feedback.
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 15, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.set("coachSlug", coachSlug);
      formData.set("parentEmail", parentEmail);
      formData.set("playerAge", playerAge);
      formData.set("swingType", swingType);
      formData.set("notes", notes);
      formData.set("video", videoFile);
      if (followUpFor) {
        formData.set("followUpFor", followUpFor);
      }

      const res = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          errors?: string[];
        };
        const message =
          data.errors?.join("; ") ?? data.error ?? "Failed to submit";
        setError(message);
        setLoading(false);
        showToast({ title: "Upload failed", description: message, variant: "error" });
        return;
      }

      const data = (await res.json()) as { id: string; status: string };
      setSuccess({
        id: data.id,
        coachName: selectedCoach?.name ?? "your coach",
      });
      showToast({
        title: "Swing uploaded!",
        description: `Your submission has been sent to ${selectedCoach?.name ?? "your coach"}.`,
        variant: "success",
      });
    } catch {
      clearInterval(progressInterval);
      setError("Network error — please try again.");
      setLoading(false);
      showToast({
        title: "Network error",
        description: "Couldn't reach the server. Please check your connection and try again.",
        variant: "error",
      });
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="text-lg font-medium">Swing uploaded!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your submission has been sent to {success.coachName}. Next step:
          complete payment to start your review.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Submission ID: <code>{success.id}</code>
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="default"
            size="lg"
            render={
              <a href={`/pay?submission=${success.id}`}>
                Continue to payment
              </a>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
      {/* Coach selection */}
      <div className="space-y-1.5">
        <label htmlFor="coach" className="text-sm font-medium">
          Choose your coach <span className="text-destructive">*</span>
        </label>
        <select
          id="coach"
          value={coachSlug}
          onChange={(e) => setCoachSlug(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Select a coach…</option>
          {coaches.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} — ${c.priceUsd}
            </option>
          ))}
        </select>
        {selectedCoach && (
          <p className="text-xs text-muted-foreground">
            {selectedCoach.turnaround === "PT12H"
              ? "12-hour"
              : selectedCoach.turnaround === "PT24H"
                ? "24-hour"
                : selectedCoach.turnaround === "PT48H"
                  ? "48-hour"
                  : "3-day"}{" "}
            turnaround guaranteed
          </p>
        )}
      </div>

      {/* Parent email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Parent email <span className="text-destructive">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {/* Player age + swing type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="age" className="text-sm font-medium">
            Player age <span className="text-destructive">*</span>
          </label>
          <input
            id="age"
            type="number"
            required
            min={5}
            max={18}
            value={playerAge}
            onChange={(e) => setPlayerAge(e.target.value)}
            placeholder="12"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="swingType" className="text-sm font-medium">
            Swing type
          </label>
          <select
            id="swingType"
            value={swingType}
            onChange={(e) => setSwingType(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="baseball">Baseball</option>
            <option value="softball">Softball</option>
          </select>
        </div>
      </div>

      {/* Video upload */}
      <div className="space-y-1.5">
        <label htmlFor="video" className="text-sm font-medium">
          Swing video <span className="text-destructive">*</span>
        </label>
        <input
          id="video"
          type="file"
          accept="video/*"
          capture="environment"
          required
          onChange={handleFile}
          className="w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted/80"
        />
        {videoFile && (
          <p className="text-xs text-muted-foreground">
            {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes for your coach (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What are you working on? Any specific concerns?"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" variant="default" size="lg" disabled={loading} className="w-full">
        {loading ? "Uploading…" : "Submit swing for review"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Payment required after upload — your coach starts the review once payment is confirmed.
      </p>
    </form>
  );
}
