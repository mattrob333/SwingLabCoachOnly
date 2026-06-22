import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as toastModule from "@/lib/toast";
import { UploadForm } from "@/components/upload/upload-form";

const coaches = [
  { slug: "marcus-reed", name: "Marcus Reed", priceUsd: 49, turnaround: "PT24H" },
];

describe("UploadForm — toast wiring slice 9", () => {
  let toastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    toastSpy = vi.spyOn(toastModule, "showToast");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function fillForm(container: HTMLElement) {
    // Select a coach
    const coachSelect = container.querySelector(
      "#coach",
    ) as HTMLSelectElement;
    fireEvent.change(coachSelect, { target: { value: "marcus-reed" } });
    // Fill required email + age fields
    const emailInput = container.querySelector("#email") as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "parent@example.com" } });
    const ageInput = container.querySelector("#age") as HTMLInputElement;
    fireEvent.change(ageInput, { target: { value: "12" } });
    // Set a video file
    const fileInput = container.querySelector("#video") as HTMLInputElement;
    const file = new File(["dummy"], "swing.mp4", { type: "video/mp4" });
    fireEvent.change(fileInput, { target: { files: [file] } });
  }

  it("fires a success toast when upload succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "sub-1", status: "uploaded" }),
    }) as typeof global.fetch;

    const { container } = render(<UploadForm coaches={coaches} />);
    fillForm(container);
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      );
    });
  });

  it("fires an error toast when upload API returns non-OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid video format" }),
    }) as typeof global.fetch;

    const { container } = render(<UploadForm coaches={coaches} />);
    fillForm(container);
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          description: expect.stringContaining("Invalid video format"),
        }),
      );
    });
  });

  it("fires an error toast on upload network failure", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as typeof global.fetch;

    const { container } = render(<UploadForm coaches={coaches} />);
    fillForm(container);
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error" }),
      );
    });
  });
});
