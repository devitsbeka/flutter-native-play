/**
 * One tap back to the top of a long list.
 *
 * Tapping the tab you are already on has scrolled to the top for a long
 * time, but nothing says so, and on the rooms list — the longest scroll in
 * the app — the tab that would do it is the one furthest from the thumb. So
 * the way back up was twenty swipes.
 *
 * The hard part is not the button, it is finding what to scroll. There is no
 * one container: MainLayout pages scroll in #main-scroll-container, the
 * leaderboards have their own, and every standalone page is its own
 * fixed-height box because the document does not scroll at all on iOS
 * (CLAUDE.md rule 4b). A hard-coded list of ids goes stale the next time a
 * page is written, so the button watches for scrolling instead of guessing
 * where it happens.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const button = read("src/components/layout/BackToTopButton.tsx");
const nav = read("src/components/layout/UniversalBottomNav.tsx");

describe("it finds whatever is scrolling", () => {
  it("a capture listener on the document, because scroll events do not bubble", () => {
    expect(button).toMatch(/document\.addEventListener\("scroll", onScroll, true\)/);
    expect(button).toMatch(/document\.removeEventListener\("scroll", onScroll, true\)/);
  });

  it("and remembers the box the finger actually moved", () => {
    expect(button).toMatch(/scrollerRef\.current = target;/);
    expect(button).toMatch(/el\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  });

  it("falling back to the containers that do have names", () => {
    expect(button).toMatch(/getElementById\("main-scroll-container"\)/);
    expect(button).toMatch(/getElementById\("leaderboard-scroll-container"\)/);
    expect(button).toMatch(/window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
  });

  it("a horizontal rail is not the page's scroller", () => {
    // Category carousels and the friends strip fire the same event; letting
    // them through would hide the button mid-swipe on a scrolled page.
    expect(button).toMatch(/el\.scrollHeight - el\.clientHeight > MIN_SCROLLABLE_PX/);
    expect(button).toMatch(/if \(!\(target instanceof HTMLElement\) \|\| !canScrollVertically\(target\)\) return;/);
  });

  it("and a fresh page starts hidden, since nothing scrolls to say so", () => {
    expect(button).toMatch(/\}, \[pathname\]\);/);
  });
});

describe("it is visible while scrolling, above the play button", () => {
  it("the bottom nav carries it, so every page with a list has it", () => {
    expect(nav).toMatch(/import \{ BackToTopButton \} from "\.\/BackToTopButton";/);
    // Inside the fixed wrapper — that is what `bottom: 100%` is measured from.
    expect(nav).toMatch(/fixed bottom-0 left-0 right-0 z-50 overflow-visible">[\s\S]{0,400}<BackToTopButton \/>/);
  });

  it("centred on the centre button and clear of its badge", () => {
    // The 90px face stands 22px proud of the bar (marginTop -42 against
    // py-5), and the plays-remaining badge another 8px above that.
    expect(nav).toMatch(/marginTop: -42/);
    expect(button).toMatch(/bottom: "calc\(100% \+ 36px\)"/);
  });

  it("centred by a box, not by a class the animation overwrites", () => {
    // `left-1/2 -translate-x-1/2` on the button itself did not survive:
    // framer writes the animated transform inline, an inline transform beats
    // a class, and the button sat half its own width right of centre.
    expect(button).toMatch(/pointer-events-none absolute inset-x-0 z-\[70\] flex justify-center/);
    // (the class name survives in the comment above it, explaining why)
    expect(button).not.toMatch(/className="[^"]*-translate-x-1\/2/);
    // Full width, so it must not eat taps meant for the cards behind it.
    expect(button).toMatch(/pointer-events-auto flex h-8 w-8/);
  });

  it("shows only once there is something to come back from", () => {
    expect(button).toMatch(/const SHOW_AFTER_PX = 320;/);
    expect(button).toMatch(/setVisible\(target\.scrollTop > SHOW_AFTER_PX\)/);
    expect(button).toMatch(/setVisible\(window\.scrollY > SHOW_AFTER_PX\)/);
  });

  it("and says what it does out loud", () => {
    expect(button).toMatch(/aria-label=\{t\("common\.backToTop"\)\}/);
    expect(read("src/locales/en.ts")).toMatch(/backToTop: "Back to top"/);
    expect(read("src/locales/ka.ts")).toMatch(/backToTop: "ზემოთ დაბრუნება"/);
  });
});
