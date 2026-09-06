/**
 * Settings, help and privacy wear the change-name sheet's surface.
 *
 * The sheet (GameModal) floats on a near-white lavender gradient with four
 * blurred brand blobs; the three pages it is reached from were a flat
 * bg-background. They now share the sheet's surface through one component
 * (owner's ask), with the page header see-through over it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const backdrop = read("src/components/shared/AmbientBlobBackdrop.tsx");
const modal = read("src/components/ui/game-modal.tsx");

describe("the ambient backdrop is the change-name sheet's surface", () => {
  it("same gradient, same four blobs", () => {
    const gradient = "linear-gradient(180deg, #FDFAFF 0%, #F6E8FF 100%)";
    expect(backdrop).toContain(`export const AMBIENT_SURFACE = "${gradient}";`);
    expect(modal).toContain(`background: "${gradient}",`);
    for (const blob of [
      "absolute -top-24 -left-24 w-96 h-96 rounded-full bg-purple-300/30 blur-3xl",
      "absolute top-1/3 -right-28 w-[28rem] h-[28rem] rounded-full bg-violet-300/25 blur-3xl",
      "absolute bottom-[-6rem] left-1/4 w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl",
      "absolute top-2/3 left-[-5rem] w-72 h-72 rounded-full bg-pink-200/30 blur-3xl",
    ]) {
      expect(backdrop).toContain(blob);
      expect(modal).toContain(blob);
    }
  });

  it("under the content and taking no taps", () => {
    expect(backdrop).toMatch(/className="absolute inset-0 z-0 overflow-hidden pointer-events-none"/);
  });
});

describe("settings, help and privacy wear it", () => {
  const pages = {
    settings: read("src/pages/Settings.tsx"),
    help: read("src/pages/Support.tsx"),
    privacy: read("src/pages/SettingsPrivacy.tsx"),
  };

  it("each mounts the backdrop and lifts its content above it", () => {
    for (const [name, src] of Object.entries(pages)) {
      expect(src, name).toMatch(/<AmbientBlobBackdrop \/>/);
      expect(src, name).toMatch(/className=\{AMBIENT_HEADER_CLASS\}/);
      // The flat sheet is gone from the page root.
      expect(src, name).not.toMatch(/className="(h-\[calc\(100dvh[^"]*|min-h-full) bg-background"/);
    }
  });

  it("the standalone pages still own their scrolling (CLAUDE.md 4b)", () => {
    for (const name of ["help", "privacy"] as const) {
      expect(pages[name], name).toMatch(
        /className="relative h-\[calc\(100dvh_-_var\(--safe-top\)_-_var\(--safe-bottom\)\)\] overflow-hidden">\s*\n\s*<AmbientBlobBackdrop \/>[\s\S]*?<div className="absolute inset-0 z-10 overflow-y-auto">/,
      );
    }
    // Settings scrolls in MainLayout's container and needs nothing.
    expect(pages.settings).toMatch(/<div className="relative min-h-full">\s*\n\s*<AmbientBlobBackdrop \/>\s*\n\s*<div className="relative z-10">/);
  });
});
