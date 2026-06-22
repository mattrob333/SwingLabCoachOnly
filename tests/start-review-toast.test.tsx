import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as toastModule from "@/lib/toast";
import { StartReviewButton } from "@/components/coach/start-review-button";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

describe("StartReviewButton — toast wiring slice 5", () => {
  let toastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    toastSpy = vi.spyOn(toastModule, "showToast");
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fires an error toast when the API returns non-OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Not authorized" }),
    }) as typeof global.fetch;

    const { getByText } = render(<StartReviewButton submissionId="sub-1" />);
    fireEvent.click(getByText("Start review"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error" }),
      );
    });
  });

  it("fires an error toast on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as typeof global.fetch;

    const { getByText } = render(<StartReviewButton submissionId="sub-1" />);
    fireEvent.click(getByText("Start review"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error" }),
      );
    });
  });

  it("does NOT fire a toast on success (redirect handles feedback)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as typeof global.fetch;

    const { getByText } = render(<StartReviewButton submissionId="sub-1" />);
    fireEvent.click(getByText("Start review"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/coach/review/sub-1");
    });
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it("includes server error message in toast description", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Already in review" }),
    }) as typeof global.fetch;

    const { getByText } = render(<StartReviewButton submissionId="sub-1" />);
    fireEvent.click(getByText("Start review"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          description: expect.stringContaining("Already in review"),
        }),
      );
    });
  });
});
