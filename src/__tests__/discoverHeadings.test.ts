/**
 * Discover's section titles wear the app's heading, not their own.
 *
 * "კლასიკური ტრივია", "გართობა" and the rest were set in a semibold slate
 * sans, while every rail on the home feed uses font-hero at 19px in the
 * app's aubergine. Scrolling from one browsing surface to the other changed
 * typeface for no reason a reader could name.
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
  /<h2 className="(font-hero[^"]*)"/.exec(src)?.[1];

describe("the two surfaces share one heading", () => {
  it("Discover's title is character-for-character the home rail's", () => {
    const home = headingClass(feed);
    const disc = headingClass(header);
    expect(home, "home rail heading").toBeDefined();
    expect(disc, "discover heading").toBeDefined();
    expect(disc).toBe(home);
  });

  it("which is font-hero at 19px in the app's aubergine", () => {
    expect(headingClass(header)).toBe(
      "font-hero text-[19px] capitalize leading-[22px] tracking-[-0.16px] text-[#402666]",
    );
  });

  it("and the slate sans it used to set is gone", () => {
    expect(header).not.toMatch(/text-lg font-semibold text-slate-800/);
  });

  it("the subtitle under it matches too", () => {
    // Left alone it would have been a 14px slate sans under a display face.
    expect(header).toMatch(
      /font-\[Nunito\] text-\[12px\] font-normal leading-\[15px\] tracking-\[-0\.16px\] text-\[#6b5b86\]\/85/,
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

describe("font-hero is the right token for Georgian", () => {
  it("Slackey carries no Georgian, so TASolivare stands behind it", () => {
    // That is why the home rails already render Georgian titles in
    // TASolivare — the same face this now brings to Discover. A bare
    // font-slackey would have fallen through to a system sans instead.
    expect(tailwind).toMatch(/hero: \[\s*\n\s*'Slackey',\s*\n\s*'TASolivare',\s*\n\s*'Nunito',/);
  });
});
