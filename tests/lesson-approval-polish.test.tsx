import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AiReviewPanel } from "@/components/coach/ai-review-panel";
import { LessonApprovalForm } from "@/components/coach/lesson-approval-form";
import type {
  LessonPlaybackManifest,
  FreezeFrameNote,
} from "@/lib/lesson/playback";
import type { LessonDraft } from "@/lib/ai/lesson-draft";

// Mock next/navigation router (used by LessonApprovalForm)
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// ── AiReviewPanel fixtures ──────────────────────────────────────────
function makeNote(overrides: Partial<FreezeFrameNote> = {}): FreezeFrameNote {
  return {
    id: "note-1",
    timecode: 12.5,
    audioUrl: "blob:http://localhost/test",
    audioDuration: 3.2,
    createdAt: 1700000000000,
    transcript: "Keep your head still.",
    transcriptStatus: "completed",
    annotations: [],
    ...overrides,
  };
}

function makeManifest(
  overrides: Partial<LessonPlaybackManifest> = {},
): LessonPlaybackManifest {
  return {
    videoUrl: "https://example.com/video.mp4",
    notes: [makeNote()],
    createdAt: 1700000000000,
    status: "processed",
    submissionId: "sub-1",
    version: 1,
    aiSummary: "Marcus has a solid foundation. Focus on hip rotation.",
    aiNoteTitles: [{ noteId: "note-1", title: "Head position at impact" }],
    ...overrides,
  };
}

// ── LessonApprovalForm fixtures ─────────────────────────────────────
function makeDraft(overrides: Partial<LessonDraft> = {}): LessonDraft {
  return {
    submissionId: "sub-1",
    title: "Swing Lesson — Marcus Reed",
    summary: "Great foundation. Focus on hip rotation and weight transfer.",
    keyPoints: [
      { label: "Stance", description: "Athletic, balanced setup." },
      { label: "Load", description: "Good weight shift to back side." },
    ],
    drills: [
      { name: "Hip Rotation Drill", category: "Mobility" },
      { name: "Tee Work", category: "Contact" },
    ],
    coachNotes: "Keep practicing your hip rotation daily.",
    status: "draft",
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────
// AiReviewPanel — UX Polish task #7
// ────────────────────────────────────────────────────────────────────
describe("AiReviewPanel — UX polish task #7 (Card + Badge primitives)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses Card primitive for the AI summary section (data-slot=card)", () => {
    const { container } = render(
      <AiReviewPanel submissionId="sub-1" manifest={makeManifest()} />,
    );
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("uses Card primitive for the moment titles section", () => {
    const manifest = makeManifest({
      notes: [makeNote(), makeNote({ id: "note-2", timecode: 25 })],
      aiNoteTitles: [
        { noteId: "note-1", title: "Head position at impact" },
        { noteId: "note-2", title: "Hip rotation" },
      ],
    });
    const { container } = render(
      <AiReviewPanel submissionId="sub-1" manifest={manifest} />,
    );
    const cards = container.querySelectorAll('[data-slot="card"]');
    // summary card + moment-titles card + approve card = at least 3
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it("uses Card primitive for the approve & send section", () => {
    const { container } = render(
      <AiReviewPanel submissionId="sub-1" manifest={makeManifest()} />,
    );
    const cards = container.querySelectorAll('[data-slot="card"]');
    // Should include the approve section card
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it("uses Badge for the 'Saved' confirmation (data-slot=badge)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const { container } = render(
      <AiReviewPanel submissionId="sub-1" manifest={makeManifest()} />,
    );
    // Click save to trigger the "Saved" indicator
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    // Wait for saved state — the Badge should appear
    await vi.waitFor(() => {
      const badges = container.querySelectorAll('[data-slot="badge"]');
      const savedBadge = Array.from(badges).find((b) =>
        b.textContent?.toLowerCase().includes("saved"),
      );
      expect(savedBadge).toBeTruthy();
    });
  });

  it("approved banner uses Card primitive (not a bespoke green div)", () => {
    const { container } = render(
      <AiReviewPanel
        submissionId="sub-1"
        manifest={makeManifest({ status: "approved" })}
      />,
    );
    // The approved banner should be inside a Card (data-slot=card)
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    // The banner text should be inside one of the cards
    const bannerInCard = Array.from(cards).some((c) =>
      c.textContent?.toLowerCase().includes("lesson approved"),
    );
    expect(bannerInCard).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────
// LessonApprovalForm — UX Polish task #7
// ────────────────────────────────────────────────────────────────────
describe("LessonApprovalForm — UX polish task #7 (Card + Badge primitives)", () => {
  it("uses Card primitive for the draft preview section (data-slot=card)", () => {
    const { container } = render(
      <LessonApprovalForm submissionId="sub-1" draft={makeDraft()} />,
    );
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("uses Badge for the draft status (data-slot=badge, warning variant)", () => {
    const { container } = render(
      <LessonApprovalForm submissionId="sub-1" draft={makeDraft()} />,
    );
    const badges = container.querySelectorAll('[data-slot="badge"]');
    expect(badges.length).toBeGreaterThanOrEqual(1);
    // draft status → warning variant (amber)
    const statusBadge = Array.from(badges).find((b) =>
      b.textContent?.toLowerCase().includes("draft"),
    );
    expect(statusBadge).toBeTruthy();
    expect(statusBadge?.className).toContain("bg-warning");
  });

  it("uses Badge success variant for approved status", () => {
    const { container } = render(
      <LessonApprovalForm
        submissionId="sub-1"
        draft={makeDraft({ status: "approved" })}
      />,
    );
    const badges = container.querySelectorAll('[data-slot="badge"]');
    const approvedBadge = Array.from(badges).find((b) =>
      b.textContent?.toLowerCase().includes("approved"),
    );
    expect(approvedBadge).toBeTruthy();
    expect(approvedBadge?.className).toContain("bg-success");
  });

  it("uses Badge destructive variant for rejected status", () => {
    const { container } = render(
      <LessonApprovalForm
        submissionId="sub-1"
        draft={makeDraft({ status: "rejected" })}
      />,
    );
    const badges = container.querySelectorAll('[data-slot="badge"]');
    const rejectedBadge = Array.from(badges).find((b) =>
      b.textContent?.toLowerCase().includes("rejected"),
    );
    expect(rejectedBadge).toBeTruthy();
    expect(rejectedBadge?.className).toContain("destructive");
  });

  it("uses Badge for drill category labels", () => {
    const { container } = render(
      <LessonApprovalForm submissionId="sub-1" draft={makeDraft()} />,
    );
    const badges = container.querySelectorAll('[data-slot="badge"]');
    // The draft has 2 drills with categories Mobility and Contact
    const categoryBadges = Array.from(badges).filter(
      (b) =>
        b.textContent?.includes("Mobility") ||
        b.textContent?.includes("Contact"),
    );
    expect(categoryBadges.length).toBe(2);
  });

  it("uses Card primitive for the approval actions section", () => {
    const { container } = render(
      <LessonApprovalForm submissionId="sub-1" draft={makeDraft()} />,
    );
    const cards = container.querySelectorAll('[data-slot="card"]');
    // draft preview card + approval actions card = at least 2
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });
});
