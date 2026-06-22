import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AiReviewPanel } from "@/components/coach/ai-review-panel";
import type {
  LessonPlaybackManifest,
  FreezeFrameNote,
} from "@/lib/lesson/playback";

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

describe("AiReviewPanel — coach reviews/edits AI output (Wave 4 Sub-slice 3c-i)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the AI summary in an editable textarea", () => {
    const manifest = makeManifest();
    render(
      <AiReviewPanel submissionId="sub-1" manifest={manifest} />,
    );
    const textarea = screen.getByLabelText(/AI lesson summary/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe(
      "Marcus has a solid foundation. Focus on hip rotation.",
    );
  });

  it("renders a title input for each note pre-filled with the AI title", () => {
    const manifest = makeManifest({
      notes: [
        makeNote({ id: "note-1", timecode: 12.5 }),
        makeNote({ id: "note-2", timecode: 25.0 }),
      ],
      aiNoteTitles: [
        { noteId: "note-1", title: "Head position at impact" },
        { noteId: "note-2", title: "Hip rotation follow-through" },
      ],
    });
    render(<AiReviewPanel submissionId="sub-1" manifest={manifest} />);
    const inputs = screen.getAllByLabelText(/moment title/i) as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].value).toBe("Head position at impact");
    expect(inputs[1].value).toBe("Hip rotation follow-through");
  });

  it("shows an empty title input for notes without an AI title", () => {
    const manifest = makeManifest({
      notes: [
        makeNote({ id: "note-1" }),
        makeNote({ id: "note-2", timecode: 25 }),
      ],
      aiNoteTitles: [{ noteId: "note-1", title: "Head position at impact" }],
    });
    render(<AiReviewPanel submissionId="sub-1" manifest={manifest} />);
    const inputs = screen.getAllByLabelText(/moment title/i) as HTMLInputElement[];
    expect(inputs[1].value).toBe("");
  });

  it("Save button PATCHes the edited summary + titles to /package", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    const manifest = makeManifest();
    render(<AiReviewPanel submissionId="sub-1" manifest={manifest} />);

    // Edit the summary
    const textarea = screen.getByLabelText(/AI lesson summary/i);
    fireEvent.change(textarea, {
      target: { value: "Edited summary — focus on weight transfer." },
    });

    // Edit a note title
    const titleInput = screen.getAllByLabelText(/moment title/i)[0];
    fireEvent.change(titleInput, { target: { value: "Edited title" } });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/submissions/sub-1/package");
    expect(opts?.method).toBe("PATCH");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.aiSummary).toBe("Edited summary — focus on weight transfer.");
    expect(body.aiNoteTitles).toEqual([
      { noteId: "note-1", title: "Edited title" },
    ]);
  });

  it("shows a saved confirmation on success", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    render(<AiReviewPanel submissionId="sub-1" manifest={makeManifest()} />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeTruthy();
    });
  });

  it("shows an error message on fetch failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid noteId" }), {
        status: 400,
      }),
    );
    render(<AiReviewPanel submissionId="sub-1" manifest={makeManifest()} />);
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Invalid noteId");
    });
  });

  it("disables the Save button while saving", async () => {
    let resolveFetch: (v: Response) => void = () => {};
    vi.spyOn(global, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<AiReviewPanel submissionId="sub-1" manifest={makeManifest()} />);
    const btn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
    resolveFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });
});
