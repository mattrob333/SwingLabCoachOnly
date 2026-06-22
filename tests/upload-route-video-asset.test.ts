import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/submissions/route";
import { SUBMISSIONS } from "@/lib/submissions";
import { VIDEO_ASSETS } from "@/lib/video-assets";
import { _resetStorageAdapterForTests } from "@/lib/storage";
import { getCoachBySlug } from "@/lib/coaches";

/**
 * Build a mock NextRequest-like object with a formData() resolver. Real
 * `Request.formData()` multipart parsing doesn't work reliably in jsdom, so
 * we mirror the pattern from tests/audio-upload-api.test.ts: construct a
 * FormData object directly and expose it through the mock.
 */
function makeMultipartRequest(form: FormData): Parameters<typeof POST>[0] {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type"
          ? "multipart/form-data; boundary=test"
          : null,
    },
    formData: async () => form,
  } as unknown as Parameters<typeof POST>[0];
}

function makeJsonRequest(body: unknown): Parameters<typeof POST>[0] {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

function makeVideoFile(name = "swing.mp4", type = "video/mp4", size = 1024): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type });
}

describe("POST /api/submissions (Wave 2 — durable upload)", () => {
  beforeEach(() => {
    SUBMISSIONS.length = 0;
    VIDEO_ASSETS.length = 0;
    _resetStorageAdapterForTests();
  });

  it("uploads the video through the storage adapter and creates a VideoAsset record", async () => {
    const coach = await getCoachBySlug("marcus-reed");
    expect(coach).toBeTruthy();

    const form = new FormData();
    form.append("coachSlug", "marcus-reed");
    form.append("parentEmail", "parent@example.com");
    form.append("playerAge", "12");
    form.append("swingType", "baseball");
    form.append("notes", "Help with load.");
    form.append("video", makeVideoFile("swing.mp4", "video/mp4", 2048));

    const res = await POST(makeMultipartRequest(form));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeTruthy();
    expect(data.status).toBe("pending_payment");
    expect(data.videoUrl).toMatch(/\/uploads\/videos\//);

    // A VideoAsset record was persisted and linked to the submission.
    expect(VIDEO_ASSETS).toHaveLength(1);
    const asset = VIDEO_ASSETS[0];
    expect(asset.submissionId).toBe(data.id);
    expect(asset.coachSlug).toBe("marcus-reed");
    expect(asset.originalFilename).toBe("swing.mp4");
    expect(asset.mimeType).toBe("video/mp4");
    expect(asset.sizeBytes).toBe(2048);
    expect(asset.storageKey).toMatch(/\.mp4$/);
    expect(asset.storageProvider).toBe("mock");
    expect(asset.id).toMatch(/^vid_/);
  });

  it("stores a .mov file and records the quicktime mime type", async () => {
    const form = new FormData();
    form.append("coachSlug", "marcus-reed");
    form.append("parentEmail", "parent@example.com");
    form.append("playerAge", "12");
    form.append("swingType", "baseball");
    form.append("notes", "x");
    form.append("video", makeVideoFile("clip.mov", "video/quicktime", 512));

    const res = await POST(makeMultipartRequest(form));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.videoUrl).toContain("/uploads/videos/");
    expect(VIDEO_ASSETS).toHaveLength(1);
    expect(VIDEO_ASSETS[0].mimeType).toBe("video/quicktime");
    expect(VIDEO_ASSETS[0].originalFilename).toBe("clip.mov");
    expect(VIDEO_ASSETS[0].sizeBytes).toBe(512);
  });

  it("rejects non-video uploads with a 400", async () => {
    const form = new FormData();
    form.append("coachSlug", "marcus-reed");
    form.append("parentEmail", "parent@example.com");
    form.append("playerAge", "12");
    form.append("swingType", "baseball");
    form.append("notes", "x");
    form.append("video", new File([new Uint8Array(10)], "photo.jpg", { type: "image/jpeg" }));

    const res = await POST(makeMultipartRequest(form));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/video/i);
    expect(VIDEO_ASSETS).toHaveLength(0);
  });

  it("still accepts JSON bodies without a video (backward compatible)", async () => {
    const body = {
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "no video this time",
      videoUrl: "https://example.com/external.mp4",
      videoFileName: "external.mp4",
    };

    const res = await POST(makeJsonRequest(body));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.videoUrl).toBe("https://example.com/external.mp4");
    // No VideoAsset record when there's no uploaded file.
    expect(VIDEO_ASSETS).toHaveLength(0);
  });

  it("creates the submission even when no video is provided (multipart, no file)", async () => {
    const form = new FormData();
    form.append("coachSlug", "marcus-reed");
    form.append("parentEmail", "parent@example.com");
    form.append("playerAge", "12");
    form.append("swingType", "baseball");
    form.append("notes", "no file");

    const res = await POST(makeMultipartRequest(form));
    expect(res.status).toBe(201);
    expect(VIDEO_ASSETS).toHaveLength(0);
  });

  it("returns 404 for an unknown coach", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const form = new FormData();
    form.append("coachSlug", "ghost-coach");
    form.append("parentEmail", "parent@example.com");
    form.append("playerAge", "12");
    form.append("swingType", "baseball");
    form.append("notes", "x");

    const res = await POST(makeMultipartRequest(form));
    expect(res.status).toBe(404);
    errSpy.mockRestore();
  });

  it("rejects oversized videos with a 400 (Wave 6 hardening)", async () => {
    // Spoof .size to exceed the 250 MB limit without allocating 250 MB of memory.
    const file = new File([new Uint8Array(1024)], "huge.mp4", {
      type: "video/mp4",
    });
    Object.defineProperty(file, "size", {
      value: 250 * 1024 * 1024 + 1,
      configurable: true,
    });

    const form = new FormData();
    form.append("coachSlug", "marcus-reed");
    form.append("parentEmail", "parent@example.com");
    form.append("playerAge", "12");
    form.append("swingType", "baseball");
    form.append("notes", "x");
    form.append("video", file);

    const res = await POST(makeMultipartRequest(form));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/large|too big|size/i);
    expect(VIDEO_ASSETS).toHaveLength(0);
  });

  it("rejects video with a disallowed mime type with a 400 (Wave 6 hardening)", async () => {
    // video/x-flv starts with "video/" so the old prefix-only check accepted
    // it and stored it with a mismatched .mp4 extension. The MIME allowlist
    // must reject formats we can't safely store/play back.
    const form = new FormData();
    form.append("coachSlug", "marcus-reed");
    form.append("parentEmail", "parent@example.com");
    form.append("playerAge", "12");
    form.append("swingType", "baseball");
    form.append("notes", "x");
    form.append(
      "video",
      new File([new Uint8Array(256)], "clip.flv", { type: "video/x-flv" }),
    );

    const res = await POST(makeMultipartRequest(form));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/video|format|type|unsupported/i);
    expect(VIDEO_ASSETS).toHaveLength(0);
  });
});
