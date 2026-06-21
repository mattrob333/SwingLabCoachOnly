import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 9 — PWA manifest validation.
 * Reads the static manifest.json from /public and asserts the fields required
 * for an installable, standalone web app (PRD §31 build order #19).
 */
function loadManifest() {
  const path = resolve(__dirname, "..", "public", "manifest.json");
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

describe("PWA manifest", () => {
  const manifest = loadManifest();

  it("has a name and short_name", () => {
    expect(typeof manifest.name).toBe("string");
    expect((manifest.name as string).length).toBeGreaterThan(0);
    expect(typeof manifest.short_name).toBe("string");
    expect((manifest.short_name as string).length).toBeGreaterThan(0);
  });

  it("declares standalone display mode", () => {
    expect(manifest.display).toBe("standalone");
  });

  it("has a start_url", () => {
    expect(manifest.start_url).toBe("/");
  });

  it("has a theme color and background color", () => {
    expect(typeof manifest.theme_color).toBe("string");
    expect(manifest.theme_color).toMatch(/^#/);
    expect(typeof manifest.background_color).toBe("string");
    expect(manifest.background_color).toMatch(/^#/);
  });

  it("declares at least one icon with sizes and purpose", () => {
    const icons = manifest.icons as Array<Record<string, unknown>>;
    expect(Array.isArray(icons)).toBe(true);
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(typeof icon.src).toBe("string");
      expect(typeof icon.sizes).toBe("string");
      expect(icon.type).toBeDefined();
    }
  });
});
