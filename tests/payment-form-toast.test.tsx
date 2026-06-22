import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as toastModule from "@/lib/toast";
import { PaymentForm } from "@/components/pay/payment-form";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

describe("PaymentForm — toast wiring slice 8", () => {
  let toastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    toastSpy = vi.spyOn(toastModule, "showToast");
    // Prevent window.location.href redirect from breaking jsdom
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Pay action ---

  it("fires a success toast when mock-mode payment succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "paid" }),
    }) as typeof global.fetch;

    const { container } = render(
      <PaymentForm submissionId="sub-1" coachName="Marcus Reed" priceUsd={49} />,
    );
    const submitBtn = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      );
    });
  });

  it("fires an error toast when pay API returns non-OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ error: "Payment required" }),
    }) as typeof global.fetch;

    const { container } = render(
      <PaymentForm submissionId="sub-1" coachName="Marcus Reed" priceUsd={49} />,
    );
    const submitBtn = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          description: expect.stringContaining("Payment required"),
        }),
      );
    });
  });

  it("fires an error toast on pay network failure", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as typeof global.fetch;

    const { container } = render(
      <PaymentForm submissionId="sub-1" coachName="Marcus Reed" priceUsd={49} />,
    );
    const submitBtn = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error" }),
      );
    });
  });

  // --- Redeem action ---

  it("fires a success toast when code redeem succeeds", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as typeof global.fetch;

    const { getByText, getByRole } = render(
      <PaymentForm submissionId="sub-1" coachName="Marcus Reed" priceUsd={49} />,
    );
    // Switch to redeem mode
    fireEvent.click(getByText("Have an invite code"));
    // Fill in a code so the form submits
    const input = document.getElementById(
      "inviteCode",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "SWINGLAB-FREE" } });
    fireEvent.click(getByRole("button", { name: "Redeem code" }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      );
    });
  });

  it("fires an error toast when redeem API returns non-OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: "Invalid code" }),
    }) as typeof global.fetch;

    const { getByText, getByRole } = render(
      <PaymentForm submissionId="sub-1" coachName="Marcus Reed" priceUsd={49} />,
    );
    fireEvent.click(getByText("Have an invite code"));
    const input = document.getElementById("inviteCode") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "BADCODE" } });
    fireEvent.click(getByRole("button", { name: "Redeem code" }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          description: expect.stringContaining("Invalid code"),
        }),
      );
    });
  });

  it("fires an error toast on redeem network failure", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as typeof global.fetch;

    const { getByText, getByRole } = render(
      <PaymentForm submissionId="sub-1" coachName="Marcus Reed" priceUsd={49} />,
    );
    fireEvent.click(getByText("Have an invite code"));
    const input = document.getElementById("inviteCode") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "SWINGLAB-FREE" } });
    fireEvent.click(getByRole("button", { name: "Redeem code" }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error" }),
      );
    });
  });
});
