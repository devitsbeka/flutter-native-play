/**
 * The green buttons speak the hero type (Figma 1085:533).
 *
 * The frame shows the same green button twice: "start" in Slackey and
 * "დაწყება" in the display face, 24px, 0.5px tracking. The app's `font-hero`
 * stack is exactly that pair — Slackey with Google Sans behind it, so
 * Georgian, which Slackey lacks, falls through to the display face. Two
 * components draw green buttons; both wear it. Nothing else changes face.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const chunky = read("src/components/ui/chunky-button.tsx");
const green = read("src/components/shared/GreenPlayButton.tsx");

describe("the hero face on the green buttons", () => {
  it("font-hero is Slackey with Google Sans behind it", () => {
    expect(read("tailwind.config.ts")).toMatch(/hero: \[\s*\n\s*'Slackey',\s*\n\s*'Google Sans'/);
  });

  it("ChunkyButton's success variant wears it, regular weight, 0.5px tracking — and only that variant", () => {
    expect(chunky).toMatch(/const heroLabel = variant === "success" \? "font-hero font-normal tracking-\[0\.5px\]" : null;/);
    // After the size ramp so its weight beats the base font-semibold, and
    // before className so a caller can still override.
    expect(chunky).toMatch(/sizeStyles\[size\],\s*\n\s*heroLabel,\s*\n\s*heroLabel && heroSizeStyles\[size\],\s*\n\s*className/);
    // One notch up per size: the hero face reads smaller than Nunito at the same px.
    expect(chunky).toMatch(/const heroSizeStyles = \{\s*\n\s*sm: "text-base",\s*\n\s*md: "text-lg",\s*\n\s*compact: "text-lg",\s*\n\s*lg: "text-xl",\s*\n\s*xl: "text-2xl",/);
  });

  it("GreenPlayButton wears it too", () => {
    expect(green).toMatch(/relative font-hero font-normal tracking-\[0\.5px\] text-white/);
    expect(green).not.toMatch(/relative font-bold text-white/);
  });

  it("the menu drawer's Play is the GreenPlayButton, so it is covered", () => {
    const drawer = read("src/components/home/SideMenuDrawer.tsx");
    expect(drawer).toMatch(/<GreenPlayButton\s*\n\s*onClick=\{handlePlayClick\}/);
  });
});
