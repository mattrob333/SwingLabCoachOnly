import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Disable rate limiting globally for tests — individual test files that
// exercise the rate limiter re-enable it via vi.stubEnv in their beforeEach.
process.env.RATE_LIMIT_DISABLED = "1";

afterEach(() => {
  cleanup();
});
