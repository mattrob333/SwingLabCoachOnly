import { describe, it, expect } from "vitest";
import { humanizeTurnaround } from "@/lib/turnaround";

describe("humanizeTurnaround", () => {
  it("renders hours-only durations", () => {
    expect(humanizeTurnaround("PT24H")).toBe("within 24 hours");
  });

  it("renders minutes-only durations", () => {
    expect(humanizeTurnaround("PT30M")).toBe("within 30 minutes");
  });

  it("renders combined hour + minute durations", () => {
    expect(humanizeTurnaround("PT1H30M")).toBe("within 1h 30m");
  });

  it("passes through unrecognized strings unchanged", () => {
    expect(humanizeTurnaround("2 days")).toBe("2 days");
  });

  it("passes through empty PT unchanged", () => {
    expect(humanizeTurnaround("PT")).toBe("PT");
  });
});
