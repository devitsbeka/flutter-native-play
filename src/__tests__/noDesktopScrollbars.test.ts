import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A sideways-scrolling row must not paint a desktop scrollbar.
 *
 * The room flow is built from horizontal chip rows — the round queue, the
 * navigation dots, the share icons. They overflow by design, and on a phone
 * that costs nothing: iOS and Android draw overlay scrollbars that fade out.
 * A desktop browser draws a classic one instead, and it lands *inside* the
 * card, as a white bar under the chips.
 *
 * Reported from the lobby on desktop, where the queue row grew a white bar
 * across the bottom of the panel. Four rows were missing the class; five
 * others already had it, which is how it went unnoticed.
 *
 * `.scrollbar-hide` (src/index.css) covers all three vendor spellings. The
 * row still scrolls — by wheel, trackpad and drag — and the chips are cut off
 * mid-pill at the edge, which is the affordance that there is more.
 */
const TEAM_DIR = join(process.cwd(), "src/components/team");

function tsxFilesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return tsxFilesIn(full);
    return entry.endsWith(".tsx") ? [full] : [];
  });
}

/** Every className string in the file that turns on horizontal overflow. */
function horizontalScrollers(source: string): string[] {
  // className="..." and className={`...`} alike — the class list is whatever
  // sits between the quotes, and both forms are used in this directory.
  const classAttrs = source.match(/className=(?:"[^"]*"|\{`[^`]*`\}|\{"[^"]*"\})/g) || [];
  return classAttrs.filter((attr) => /\boverflow-x-auto\b/.test(attr));
}

describe("horizontal rows in the room flow", () => {
  const files = tsxFilesIn(TEAM_DIR);

  it("finds the components to check", () => {
    // Guards the walker itself: a rename that empties this list would make
    // every assertion below pass without checking anything.
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => f.endsWith("CategoryPickerSection.tsx"))).toBe(true);
  });

  it("hide the scrollbar the desktop would otherwise paint", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const attr of horizontalScrollers(source)) {
        if (!/\bscrollbar-hide\b/.test(attr)) {
          offenders.push(`${file.slice(process.cwd().length + 1)}: ${attr}`);
        }
      }
    }

    expect(
      offenders,
      "overflow-x-auto without scrollbar-hide paints a white bar inside the card " +
        "on desktop (phones use overlay scrollbars, so it looks fine there). " +
        "Add scrollbar-hide to:\n  " + offenders.join("\n  ")
    ).toEqual([]);
  });
});
