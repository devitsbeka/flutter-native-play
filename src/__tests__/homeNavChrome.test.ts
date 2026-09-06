/**
 * The home's hero counts from the nav's top edge, and one edge only.
 *
 * The nav is fixed to the screen's bottom; the scroller ends a full
 * home-indicator inset above it (#root pads the inset). Measuring the nav's
 * height from the scroller's bottom put the feed's lip and the profile card
 * 34px higher in the app than on the web, and the default scene — on a
 * third formula — ended 9px short of the feed, a pale band on scroll.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const home = read("src/components/home/MobileHome.tsx");
const scroll = read("src/components/home/MobileHomeScroll.tsx");
const nav = read("src/components/layout/UniversalBottomNav.tsx");
const css = read("src/index.css");

describe("one measure for the nav's overlap with the scroller", () => {
  it("is the nav's height minus the inset the scroller already leaves", () => {
    expect(home).toMatch(
      /export const NAV_CHROME =\s*\n\s*"calc\(88px \+ max\(0\.25rem, var\(--safe-bottom\) \/ 2\) - var\(--safe-bottom\)\)";/,
    );
    // The two facts it is built from: the nav's own padding, and the root's.
    expect(nav).toMatch(/paddingBottom: "max\(0\.25rem, calc\(env\(safe-area-inset-bottom, 0px\) \/ 2\)\)"/);
    expect(css).toMatch(/#root \{\s*\n\s*padding-top: var\(--safe-top\);\s*\n\s*padding-bottom: var\(--safe-bottom\);/);
  });

  it("the scene's foot, the feed's lip and the card all count from it", () => {
    expect(home).toMatch(/const style: React\.CSSProperties = \{ bottom: NAV_CHROME, \.\.\.SCENE_TOP_FADE \};/);
    expect(home).toMatch(/bottom: `calc\(\$\{NAV_CHROME\} \+ \$\{CARD_GAP_ABOVE_NAV\}px\)`/);
    expect(scroll).toMatch(/marginTop: `calc\(-1 \* \(\$\{NAV_CHROME\}\)\)`/);
  });
});
