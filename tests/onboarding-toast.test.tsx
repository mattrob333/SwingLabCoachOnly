import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as toastModule from "@/lib/toast";
import { OnboardingForm } from "@/components/coach/onboarding-form";

const pushMock = vi.fn();
const refreshMock = vi.fn();

// Mock next/navigation router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

function fillStep1(container: HTMLElement) {
  const nameInput = container.querySelector("#name") as HTMLInputElement;
  fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
  const bioInput = container.querySelector("#bio") as HTMLTextAreaElement;
  fireEvent.change(bioInput, { target: { value: "Experienced coach" } });
}

function fillStep2(container: HTMLElement) {
  const priceInput = container.querySelector("#priceUsd") as HTMLInputElement;
  fireEvent.change(priceInput, { target: { value: "49" } });
}

function advanceToFinalStep(container: HTMLElement, getByText: (t: string) => HTMLElement) {
  fillStep1(container);
  fireEvent.click(getByText("Continue"));
  fillStep2(container);
  fireEvent.click(getByText("Continue"));
}

describe("OnboardingForm — toast wiring slice 3", () => {
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

  it("fires an error toast when the API returns a non-OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Name is required" }),
    }) as typeof global.fetch;

    const { container, getByText } = render(<OnboardingForm />);
    advanceToFinalStep(container, getByText);

    fireEvent.click(getByText("Save profile"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
        }),
      );
    });
  });

  it("fires an error toast on network failure (fetch rejects)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as typeof global.fetch;

    const { container, getByText } = render(<OnboardingForm />);
    advanceToFinalStep(container, getByText);

    fireEvent.click(getByText("Save profile"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
        }),
      );
    });
  });

  it("does NOT fire a toast on successful submission (redirect handles feedback)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as typeof global.fetch;

    const { container, getByText } = render(<OnboardingForm />);
    advanceToFinalStep(container, getByText);

    fireEvent.click(getByText("Save profile"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/coach/dashboard");
    });
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it("includes the server error message in the toast description", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ errors: ["Name is required", "Bio is required"] }),
    }) as typeof global.fetch;

    const { container, getByText } = render(<OnboardingForm />);
    advanceToFinalStep(container, getByText);

    fireEvent.click(getByText("Save profile"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          description: expect.stringContaining("Name is required"),
        }),
      );
    });
  });
});
