import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as toastModule from "@/lib/toast";
import { SubmissionDangerActions } from "@/components/coach/submission-danger-actions";

// Mock next/navigation useRouter so we can assert redirect on delete.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("SubmissionDangerActions — revoke delivery link", () => {
  let toastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    toastSpy = vi.spyOn(toastModule, "showToast");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a Revoke delivery link button when canRevoke is true", () => {
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={true}
        canDelete={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: /revoke delivery link/i }),
    ).toBeTruthy();
  });

  it("does not render the Revoke button when canRevoke is false", () => {
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={false}
        canDelete={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /revoke delivery link/i }),
    ).toBeNull();
  });

  it("shows a confirmation prompt before revoking; Cancel returns to button", () => {
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={true}
        canDelete={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /revoke delivery link/i }),
    );
    expect(screen.getByText(/are you sure/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /confirm revoke/i }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.getByRole("button", { name: /revoke delivery link/i }),
    ).toBeTruthy();
    expect(screen.queryByText(/are you sure/i)).toBeNull();
  });

  it("POSTs to /revoke-link and fires a success toast on confirm", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ revokedCount: 2 }), { status: 200 }),
    );
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={true}
        canDelete={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /revoke delivery link/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm revoke/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/submissions/sub-1/revoke-link");
    expect(opts?.method).toBe("POST");
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy.mock.calls[0][0].variant).toBe("success");
  });

  it("fires an error toast on revoke failure (non-ok response)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    );
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={true}
        canDelete={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /revoke delivery link/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm revoke/i }));
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledTimes(1);
    });
    expect(toastSpy.mock.calls[0][0].variant).toBe("error");
  });

  it("fires an error toast on revoke network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={true}
        canDelete={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /revoke delivery link/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm revoke/i }));
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledTimes(1);
    });
    expect(toastSpy.mock.calls[0][0].variant).toBe("error");
  });
});

describe("SubmissionDangerActions — delete submission", () => {
  let toastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    toastSpy = vi.spyOn(toastModule, "showToast");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a Delete submission button when canDelete is true", () => {
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={false}
        canDelete={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: /delete submission/i }),
    ).toBeTruthy();
  });

  it("does not render the Delete button when canDelete is false", () => {
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={false}
        canDelete={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /delete submission/i }),
    ).toBeNull();
  });

  it("shows a confirmation prompt before deleting; Cancel returns to button", () => {
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={false}
        canDelete={true}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /delete submission/i }),
    );
    expect(screen.getByText(/irreversible/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /confirm delete/i }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.getByRole("button", { name: /delete submission/i }),
    ).toBeTruthy();
    expect(screen.queryByText(/irreversible/i)).toBeNull();
  });

  it("DELETEs the submission and fires a success toast on confirm", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, submissionId: "sub-1" }), {
        status: 200,
      }),
    );
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={false}
        canDelete={true}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /delete submission/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/submissions/sub-1");
    expect(opts?.method).toBe("DELETE");
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy.mock.calls[0][0].variant).toBe("success");
  });

  it("fires an error toast on delete failure (non-ok response)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    );
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={false}
        canDelete={true}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /delete submission/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledTimes(1);
    });
    expect(toastSpy.mock.calls[0][0].variant).toBe("error");
  });

  it("fires an error toast on delete network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={false}
        canDelete={true}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /delete submission/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledTimes(1);
    });
    expect(toastSpy.mock.calls[0][0].variant).toBe("error");
  });

  it("disables the Confirm Delete button while deleting", async () => {
    let resolveFetch: (v: Response) => void = () => {};
    vi.spyOn(global, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(
      <SubmissionDangerActions
        submissionId="sub-1"
        canRevoke={false}
        canDelete={true}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /delete submission/i }),
    );
    const confirmBtn = screen.getByRole("button", { name: /confirm delete/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(confirmBtn).toBeDisabled();
    });
    resolveFetch(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
  });
});
