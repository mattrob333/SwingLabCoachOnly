import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as toastModule from "@/lib/toast";
import { LoginForm } from "@/components/auth/login-form";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe("LoginForm — toast wiring slice 4", () => {
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

  it("fires an error toast when login API returns non-OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid credentials" }),
    }) as typeof global.fetch;

    const { container, getByText } = render(<LoginForm />);
    const slugInput = container.querySelector("#slug") as HTMLInputElement;
    fireEvent.change(slugInput, { target: { value: "marcus-reed" } });
    const pwInput = container.querySelector("#password") as HTMLInputElement;
    fireEvent.change(pwInput, { target: { value: "wrongpass" } });

    fireEvent.click(getByText("Sign in"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
        }),
      );
    });
  });

  it("fires an error toast on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as typeof global.fetch;

    const { container, getByText } = render(<LoginForm />);
    const slugInput = container.querySelector("#slug") as HTMLInputElement;
    fireEvent.change(slugInput, { target: { value: "marcus-reed" } });
    const pwInput = container.querySelector("#password") as HTMLInputElement;
    fireEvent.change(pwInput, { target: { value: "swinglab123" } });

    fireEvent.click(getByText("Sign in"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
        }),
      );
    });
  });

  it("does NOT fire a toast on successful login (redirect handles feedback)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as typeof global.fetch;

    const { container, getByText } = render(<LoginForm />);
    const slugInput = container.querySelector("#slug") as HTMLInputElement;
    fireEvent.change(slugInput, { target: { value: "marcus-reed" } });
    const pwInput = container.querySelector("#password") as HTMLInputElement;
    fireEvent.change(pwInput, { target: { value: "swinglab123" } });

    fireEvent.click(getByText("Sign in"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/coach/dashboard");
    });
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it("includes server error message in toast description", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid credentials" }),
    }) as typeof global.fetch;

    const { container, getByText } = render(<LoginForm />);
    const slugInput = container.querySelector("#slug") as HTMLInputElement;
    fireEvent.change(slugInput, { target: { value: "marcus-reed" } });
    const pwInput = container.querySelector("#password") as HTMLInputElement;
    fireEvent.change(pwInput, { target: { value: "wrongpass" } });

    fireEvent.click(getByText("Sign in"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          description: expect.stringContaining("Invalid credentials"),
        }),
      );
    });
  });
});
