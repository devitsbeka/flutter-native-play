import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const page = read("src/pages/PublicProfile.tsx");
const background = read("src/components/GlobalSplineBackground.tsx");

/**
 * "i added friend i clicked on friends profile, when i viewed profile and
 * than clicked back button it shows this empty page with blob video on it"
 * (owner).
 *
 * A friend-request notification opens /profile/:userId (Notifications.tsx).
 * That route's job is to raise the app's one profile modal and get out of
 * the way — and it rendered `null` while the modal was up. `/profile` wears
 * the app's global background, so a closed modal over an empty route is a
 * lavender page with a blob loop drifting across it: no header, no way
 * back, nothing to tap.
 */
describe("the profile link", () => {
  it("draws something of its own, so the route is never an empty page", () => {
    expect(page).not.toMatch(/return null;/);
    expect(page).toMatch(/<div className="fixed inset-0 z-\[60\] flex items-center justify-center" aria-busy>/);
    expect(page).toMatch(/animate-spin/);
    // And this is why an empty route is visible at all.
    expect(background).toMatch(/const BACKGROUND_PAGES = \[[^\]]*"\/profile"/);
  });

  it("leaves whenever the modal is not up, however the route was reached", () => {
    // Watched, not remembered: the old guard left only if THIS mount had
    // opened the modal, and cleared that flag on the way out — so a bounce
    // back onto the route stranded it with nothing open and nothing to do.
    expect(page).toMatch(/if \(currentProfileUserId\) return;\s*\n\s*const timer = setTimeout\(\(\) => \{/);
    expect(page).toMatch(/if \(window\.history\.length > 1\) \{\s*\n\s*navigate\(-1\);\s*\n\s*\} else \{\s*\n\s*navigate\("\/", \{ replace: true \}\);/);
    expect(page).toMatch(/\}, \[currentProfileUserId, navigate\]\);/);
  });

  it("opens once per person, and closing never reopens it", () => {
    expect(page).toMatch(/const openedFor = useRef<string \| null>\(null\);/);
    expect(page).toMatch(/if \(userId && openedFor\.current !== userId\) \{\s*\n\s*openedFor\.current = userId;\s*\n\s*openProfile\(userId\);/);
    // The old infinite loop: currentProfileUserId in the opener's deps.
    expect(page).toMatch(/\}, \[userId, openProfile\]\);/);
    expect(page).not.toMatch(/useLayoutEffect\([\s\S]*?\[userId, openProfile, currentProfileUserId\]/);
  });
});
