import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A retracted header does not survive a trip into a room.
 *
 * TeamV2 is one component for the list, the lobby, the countdown, the match
 * and the results: each of those is an early `return` further down, not a
 * route, so the page never unmounts and none of its state is ever reset.
 * `headerCollapsed` was part of that state, and the only thing that clears
 * it is the scroll listener — which needs six pixels of movement before it
 * fires at all.
 *
 * So: scroll the rooms list down (header retracts), open a room, press
 * back. The list returns with `headerCollapsed` still true, the chrome
 * still transformed up off the top of the screen — and because a transform
 * moves what you see and not the space it occupies, the header's layout box
 * stays behind as a blank strip above the first card, until something
 * scrolls (owner: "i see this white empty space on online game page
 * sometimes ... when i open the room and click back button i think i see
 * this white empty space after that").
 *
 * This is the same family as teamHeaderMeasuresWhenItMounts: state about
 * the chrome, set once by an event that may never come again.
 */

const page = readFileSync(join(process.cwd(), "src/pages/TeamV2.tsx"), "utf8");

describe("coming back to the list", () => {
  it("settles the header against the scroller, not against what was true before", () => {
    expect(page).toMatch(/const onList = phase === "idle" \|\| !currentRoom;/);
    expect(page).toMatch(
      /if \(!onList\) return;\s*\n\s*const scroller = document\.getElementById\("main-scroll-container"\);\s*\n\s*setHeaderCollapsed\(\(scroller\?\.scrollTop \?\? 0\) > headerHeight\);/,
    );
  });

  it("re-runs when the page comes back, and when the header is re-measured", () => {
    // headerHeight is in the deps because it is what the comparison is
    // against — and it arrives on a later render than the first one
    // (teamHeaderMeasuresWhenItMounts).
    expect(page).toMatch(/\}, \[onList, headerHeight\]\);/);
  });

  it("covers every screen that returns instead of unmounting", () => {
    // If any of these became a route, `onList` would still be correct —
    // but while they are early returns, this is the only thing that resets
    // the chrome.
    for (const guard of [
      /if \(phase === "lobby" && currentRoom\) \{/,
      /if \(phase === "results" && currentRoom\) \{/,
      /if \(phase === "playing" && currentRoom\) \{/,
    ]) {
      expect(page).toMatch(guard);
    }
  });

  it("and the transform it controls is unchanged", () => {
    expect(page).toMatch(
      /const chromeShift = headerCollapsed \? `translateY\(-\$\{headerHeight\}px\)` : "translateY\(0\)";/,
    );
    expect(page).toMatch(/style=\{\{ top: headerHeight, transform: chromeShift, transition: CHROME_EASE \}\}/);
  });
});
