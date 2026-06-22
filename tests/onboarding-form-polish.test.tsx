import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { OnboardingForm } from "@/components/coach/onboarding-form";

// Mock next/navigation router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("OnboardingForm — UX polish task #5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps the form in a Card primitive (data-slot=card)", () => {
    const { container } = render(<OnboardingForm />);
    const card = container.querySelector('[data-slot="card"]');
    expect(card).not.toBeNull();
  });

  it("renders the step indicator with 3 steps", () => {
    const { getByText } = render(<OnboardingForm />);
    expect(getByText("Profile")).toBeTruthy();
    expect(getByText("Pricing")).toBeTruthy();
    expect(getByText("Highlights")).toBeTruthy();
  });

  it("step 1 Continue button is disabled when required name field is empty", () => {
    const { getByText, container } = render(<OnboardingForm />);
    const continueBtn = getByText("Continue");
    // Name is required and empty by default → disabled
    expect(continueBtn).toBeDisabled();

    // Fill in the name → enabled
    const nameInput = container.querySelector("#name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
    // Bio is also required
    const bioInput = container.querySelector("#bio") as HTMLTextAreaElement;
    fireEvent.change(bioInput, { target: { value: "Experienced coach" } });
    expect(continueBtn).not.toBeDisabled();
  });

  it("shows validation hint when required field is empty on step 1", () => {
    const { container } = render(<OnboardingForm />);
    // Should show a hint about required fields
    expect(container.textContent).toMatch(/required|please fill|complete/i);
  });

  it("step 2 Continue button is disabled when priceUsd is empty", () => {
    const { getByText, container } = render(<OnboardingForm />);

    // Fill step 1 required fields to advance
    const nameInput = container.querySelector("#name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
    const bioInput = container.querySelector("#bio") as HTMLTextAreaElement;
    fireEvent.change(bioInput, { target: { value: "Experienced coach" } });

    // Click Continue to go to step 2
    fireEvent.click(getByText("Continue"));

    // Price is required and empty → the submit button on step 2 should be disabled
    // Wait — step 2 has Continue (not submit). Let me check.
    // Actually step 1 has Continue, step 2 has Continue, step 3 has "Save profile".
    // Step 2's Continue should be disabled when priceUsd is empty.
    const continueBtns = container.querySelectorAll('button[type="submit"]');
    // Find the one that says "Continue"
    const step2Btn = Array.from(continueBtns).find(
      (b) => b.textContent === "Continue",
    );
    expect(step2Btn).toBeTruthy();
    expect(step2Btn).toBeDisabled();

    // Fill price → enabled
    const priceInput = container.querySelector("#priceUsd") as HTMLInputElement;
    fireEvent.change(priceInput, { target: { value: "49" } });
    expect(step2Btn).not.toBeDisabled();
  });
});
