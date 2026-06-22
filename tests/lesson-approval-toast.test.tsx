import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as toastModule from "@/lib/toast";
import { LessonApprovalForm } from "@/components/coach/lesson-approval-form";
import type { LessonDraft } from "@/lib/ai/lesson-draft";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

function makeDraft(overrides: Partial<LessonDraft> = {}): LessonDraft {
  return {
    submissionId: "sub-1",
    title: "Swing Lesson — Marcus Reed",
    summary: "Great foundation. Focus on hip rotation and weight transfer.",
    keyPoints: [{ label: "Stance", description: "Athletic, balanced setup." }],
    drills: [{ name: "Hip Rotation Drill", category: "Mobility" }],
    coachNotes: "Keep practicing your hip rotation daily.",
    status: "draft",
    ...overrides,
  };
}

describe("LessonApprovalForm — toast wiring slice 6", () => {
  let toastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    toastSpy = vi.spyOn(toastModule, "showToast");
    refreshMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fires a success toast when saving notes succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as typeof global.fetch;

    const { getByText } = render(
      <LessonApprovalForm submissionId="sub-1" draft={makeDraft()} />,
    );
    fireEvent.click(getByText("Save notes"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      );
    });
  });

  it("fires a success toast when approving succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as typeof global.fetch;

    const { getByText } = render(
      <LessonApprovalForm submissionId="sub-1" draft={makeDraft()} />,
    );
    fireEvent.click(getByText("Approve lesson"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      );
    });
  });

  it("fires a success toast when rejecting succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as typeof global.fetch;

    const { getByText } = render(
      <LessonApprovalForm submissionId="sub-1" draft={makeDraft()} />,
    );
    fireEvent.click(getByText("Reject"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      );
    });
  });

  it("fires an error toast when the API returns non-OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Not authorized" }),
    }) as typeof global.fetch;

    const { getByText } = render(
      <LessonApprovalForm submissionId="sub-1" draft={makeDraft()} />,
    );
    fireEvent.click(getByText("Save notes"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          description: expect.stringContaining("Not authorized"),
        }),
      );
    });
  });

  it("fires an error toast on network failure", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as typeof global.fetch;

    const { getByText } = render(
      <LessonApprovalForm submissionId="sub-1" draft={makeDraft()} />,
    );
    fireEvent.click(getByText("Approve lesson"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error" }),
      );
    });
  });
});
