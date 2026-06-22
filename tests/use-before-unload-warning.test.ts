import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBeforeUnloadWarning } from "@/components/review/use-before-unload-warning";

describe("useBeforeUnloadWarning", () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not add a beforeunload listener when shouldWarn is false", () => {
    renderHook(() => useBeforeUnloadWarning(false));
    const beforeUnloadCalls = addSpy.mock.calls.filter(
      ([event]) => event === "beforeunload",
    );
    expect(beforeUnloadCalls).toHaveLength(0);
  });

  it("adds a beforeunload listener when shouldWarn is true", () => {
    renderHook(() => useBeforeUnloadWarning(true));
    const beforeUnloadCalls = addSpy.mock.calls.filter(
      ([event]) => event === "beforeunload",
    );
    expect(beforeUnloadCalls).toHaveLength(1);
  });

  it("removes the listener on unmount", () => {
    const { unmount } = renderHook(() => useBeforeUnloadWarning(true));
    unmount();
    const beforeUnloadRemoves = removeSpy.mock.calls.filter(
      ([event]) => event === "beforeunload",
    );
    expect(beforeUnloadRemoves).toHaveLength(1);
  });

  it("adds listener when shouldWarn transitions from false to true", () => {
    const { rerender } = renderHook(
      ({ shouldWarn }) => useBeforeUnloadWarning(shouldWarn),
      { initialProps: { shouldWarn: false } },
    );
    expect(
      addSpy.mock.calls.filter(([e]) => e === "beforeunload"),
    ).toHaveLength(0);

    rerender({ shouldWarn: true });
    expect(
      addSpy.mock.calls.filter(([e]) => e === "beforeunload"),
    ).toHaveLength(1);
  });

  it("removes listener when shouldWarn transitions from true to false", () => {
    const { rerender } = renderHook(
      ({ shouldWarn }) => useBeforeUnloadWarning(shouldWarn),
      { initialProps: { shouldWarn: true } },
    );

    rerender({ shouldWarn: false });
    expect(
      removeSpy.mock.calls.filter(([e]) => e === "beforeunload"),
    ).toHaveLength(1);
  });

  it("the listener calls preventDefault and sets returnValue", () => {
    renderHook(() => useBeforeUnloadWarning(true));

    const handler = addSpy.mock.calls.find(
      ([e]) => e === "beforeunload",
    )?.[1] as ((e: BeforeUnloadEvent) => void) | undefined;

    expect(handler).toBeDefined();

    const event = {
      preventDefault: vi.fn(),
      returnValue: "",
    } as unknown as BeforeUnloadEvent;

    handler!(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).not.toBe("");
  });

  it("does not double-add when shouldWarn stays true across re-renders", () => {
    const { rerender } = renderHook(() => useBeforeUnloadWarning(true));
    rerender();
    rerender();
    expect(
      addSpy.mock.calls.filter(([e]) => e === "beforeunload"),
    ).toHaveLength(1);
  });
});
