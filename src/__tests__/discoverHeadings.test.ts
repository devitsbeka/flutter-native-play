/**
 * Discover's section titles wear the app's heading, not their own.
 *
 * "კლასიკური ტრივია", "გართობა" and the rest were set in a semibold slate
 * sans, while every rail on the home feed uses the home frame's heading —
 * the display face at 26px in its deep aubergine (Figma 1076:2116).
 * Scrolling from one browsing surface to the other changed typeface for no
 * reason a reader could name.
 *
 * One component carries all twelve of Discover's titles, so this is one
 * change rather than twelve — and the test pins the two headings to each
 * other rather than to a literal, so the next time the home rail's heading
 * moves, whichever one is edited first fails until they agree again.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const header = read("src/components/discover/SectionHeader.tsx");
const feed = read("src/components/home/MobileHomeFeed.tsx");
const discover = read("src/pages/Discover.tsx");
const tailwind = read("tailwind.config.ts");

/** The heading class list, from whichever file we pull it out of. */
const headingClass = (src: string): string | undefined =>
  /<h2 className="(?:min-w-0 truncate )?(font-display[^"]*)"/.exec(src)?.[1];

describe("the two surfaces share one heading", () => {
  it("Discover's title is character-for-character the home rail's", () => {
    const home = headingClass(feed);
    const disc = headingClass(header);
    expect(home, "home rail heading").toBeDefined();
    expect(disc, "discover heading").toBeDefined();
    expect(disc).toBe(home);
  });

  it("which is the frame's display face at 26px in its deep aubergine", () => {
    expect(headingClass(header)).toBe(
      "font-display text-[26px] leading-[34px] tracking-[-0.16px] text-[#552d7a]",
    );
  });

  it("with room under the baseline for Georgian", () => {
    // `truncate` is overflow:hidden, so the line box IS the clip box. At the
    // frame's 22.5px it is shorter than the 26px type, and the tails in
    // "ოთახები" and "კლასიკური ტრივია" were sliced along the bottom. Latin
    // survives that; Georgian does not.
    for (const [name, src] of [["home", feed], ["discover", header]] as const) {
      const cls = headingClass(src) ?? "";
      const lead = Number(/leading-\[(\d+(?:\.\d+)?)px\]/.exec(cls)?.[1]);
      const size = Number(/text-\[(\d+)px\]/.exec(cls)?.[1]);
      expect(lead, `${name} leading`).toBeGreaterThan(size);
    }
    // And the home row is allowed to grow to hold it.
    expect(feed).toMatch(/min-h-\[29px\] items-center/);
    expect(feed).not.toMatch(/flex h-\[29px\] items-center/);
  });

  it("and the slate sans it used to set is gone", () => {
    expect(header).not.toMatch(/text-lg font-semibold text-slate-800/);
  });

  it("the subtitle under it matches too", () => {
    // Left alone it would have been a 14px slate sans under the heading.
    expect(header).toMatch(
      /font-\[Nunito\] text-\[12px\] font-medium leading-\[15px\] tracking-\[-0\.16px\] text-\[#6b5b86\]"/,
    );
    expect(header).not.toMatch(/text-sm mt-0\.5 text-slate-600/);
  });
});

describe("one component, every title", () => {
  it("Discover sets no section heading of its own", () => {
    // If it ever does, this change would only have fixed some of them.
    expect(discover).not.toMatch(/text-lg font-semibold/);
    expect(discover.match(/<SectionHeader/g)?.length ?? 0).toBeGreaterThan(5);
  });
});

describe("font-display is the right token for Georgian", () => {
  it("is TASolivare, the face the frame sets its headings in", () => {
    expect(tailwind).toMatch(/display: \[\s*\n\s*'TASolivare',/);
  });
});
