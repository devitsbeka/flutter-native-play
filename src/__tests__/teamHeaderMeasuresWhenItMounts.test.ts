/**
 * The team page's sticky tabs sit under the header on a cold start too.
 *
 * The header (title + friends reel) is measured so the tab bar can stick
 * exactly below it, and the scroll listener that retracts the header is
 * attached to MainLayout's scroller. Both were mount-only effects reading a
 * ref — and the page does not always mount with a header: on a cold start
 * it renders a spinner while auth resolves, and the header and the scroller
 * appear on a later render. So both effects ran once, against nothing, and
 * never again: the height stayed at its 64px default, the tabs stuck 64px
 * down behind a ~190px header, and the header never retracted. A warm
 * navigation measured fine, which is why it was "sometimes" (owner:
 * "sometimes ... sticky header with header + friends rail and sometimes
 * public/private tabs and search filter below ... check why").
 *
 * The header is state now, set by a callback ref, and both effects key on
 * it — they run when the header arrives, whenever that is.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(process.cwd(), "src/pages/TeamV2.tsx"), "utf8");

describe("the header element", () => {
  it("is state set by a callback ref, not a ref read once", () => {
    expect(page).toMatch(/const \[headerEl, setHeaderEl\] = useState<HTMLDivElement \| null>\(null\);/);
    expect(page).toMatch(/ref=\{setHeaderEl\}\s*\n\s*className="sticky top-0 z-30/);
    expect(page).not.toMatch(/headerRef/);
  });

  it("is measured whenever it arrives, and the scroll listener waits for it", () => {
    expect(page).toMatch(/const el = headerEl;\s*\n\s*if \(!el\) return;\s*\n\s*const update = \(\) => setHeaderHeight\(el\.offsetHeight\);[\s\S]*?\}, \[headerEl\]\);/);
    expect(page).toMatch(/if \(!headerEl\) return;\s*\n\s*const scroller = document\.getElementById\("main-scroll-container"\);/);
    expect(page).toMatch(/scroller\.removeEventListener\("scroll", onScroll\);[\s\S]*?\}, \[headerEl, headerHeight\]\);/);
  });

  it("the tab bar still sticks at the measured height and rides the same shift", () => {
    expect(page).toMatch(/style=\{\{ top: headerHeight, transform: chromeShift, transition: CHROME_EASE \}\}/);
  });
});
