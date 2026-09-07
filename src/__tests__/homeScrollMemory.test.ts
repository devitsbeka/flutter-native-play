/**
 * Back lands where the player was, on the page they started from.
 *
 * Two halves of one report: pressing Back after a game showed the chooser
 * again, and getting home from there put the player at the top of a feed
 * they had scrolled halfway down (owner: "we should go on the main page and
 * I should see the exact area where I was before clicking").
 *
 * The chooser half is `ownsRoute`: on its own route it replaces its history
 * entry when it hands off to a game, so Back is whatever came before it.
 * It is deliberately NOT unconditional — inside the rooms hub the chooser is
 * an overlay with no entry of its own, and replacing would swallow the hub's.
 *
 * The scroll half is useScrollMemory, whose one subtlety is where the
 * position is read. The obvious place — the effect's cleanup, as the page
 * leaves — is wrong: React has already detached the node by then and a
 * detached element reports `scrollTop` 0, so every visit stored a 0 and
 * nothing was ever restored. It is recorded while scrolling instead.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hook = read("src/hooks/useScrollMemory.ts");
const scroll = read("src/components/home/MobileHomeScroll.tsx");
const chooser = read("src/components/team/CreateRoomPage.tsx");
const route = read("src/pages/CreateRoom.tsx");

describe("the chooser replaces its own entry, and only its own", () => {
  it("replaces when it is the page", () => {
    expect(chooser).toMatch(
      /const handoff = \(to: string, options\?: \{ state\?: unknown \}\) =>\s*\n\s*navigate\(to, \{ \.\.\.options, replace: ownsRoute \}\);/,
    );
    expect(chooser).toMatch(/ownsRoute\?: boolean;/);
    // Off unless the caller says otherwise: the rooms hub renders this as an
    // overlay and passes nothing, so its own entry is never swallowed.
    expect(chooser).toMatch(/ownsRoute = false/);
    expect(route).toMatch(/ownsRoute/);
  });

  it("and the flag is not tied to a deep link", () => {
    // It used to be `Boolean(initialMode)`, which covered a card on the home
    // rail but not the nav's Play button — that one navigates to
    // /create-room with no mode, and Back still landed on the chooser.
    expect(chooser).not.toMatch(/cameFromRail/);
  });
});

describe("the home feed remembers where it was", () => {
  it("records while scrolling, never on the way out", () => {
    expect(hook).toMatch(/const record = \(\) => \{\s*\n\s*if \(!restoring\) positions\.set\(key, el\.scrollTop\);/);
    expect(hook).toMatch(/el\.addEventListener\("scroll", record, \{ passive: true \}\)/);
    // The cleanup only unsubscribes. Reading scrollTop there is the bug
    // this replaced: the node is detached by then and reports 0.
    const cleanup = hook.slice(hook.indexOf("return () => {"));
    expect(cleanup).toMatch(/removeEventListener\("scroll", record\)/);
    expect(cleanup).not.toMatch(/positions\.set/);
  });

  it("ignores the scrolls it causes itself", () => {
    // Restoring assigns scrollTop, which fires scroll events carrying the
    // clamped value — recording those would erase the target being restored.
    expect(hook).toMatch(/let restoring = target > 0;/);
    expect(hook).toMatch(/if \(!restoring \|\| !ref\.current\) return;/);
  });

  it("keeps re-applying while the rails land, then gives up", () => {
    // A remembered offset against a page that has not finished loading
    // clamps to the short page's bottom, and the rest arrives underneath.
    expect(hook).toMatch(/const max = node\.scrollHeight - node\.clientHeight;/);
    expect(hook).toMatch(/node\.scrollTop = Math\.min\(target, max\);/);
    expect(hook).toMatch(/if \(max >= target \|\| performance\.now\(\) > deadline\)/);
    expect(hook).toMatch(/RESTORE_WINDOW_MS = 2500/);
  });

  it("stops the moment the player touches the page", () => {
    for (const ev of ["pointerdown", "touchstart", "wheel", "keydown"]) {
      expect(hook).toMatch(new RegExp(`addEventListener\\("${ev}", stop`));
    }
  });

  it("and tells the tap guard the scrolls are its own", () => {
    // Otherwise the guard reads a restoring feed as a page moving under the
    // finger and swallows every tap until it finishes — a dead home for the
    // second after coming back to it.
    expect(hook).toMatch(/import \{ markProgrammaticScroll \}/);
    expect(hook).toMatch(/markProgrammaticScroll\(node\);[\s\S]*?node\.scrollTop = Math\.min\(target, max\);/);
  });

  it("and the feed's scroller is the thing it watches", () => {
    expect(scroll).toMatch(/useScrollMemory<HTMLDivElement>\("home-feed"\)/);
    expect(scroll).toMatch(
      /<div ref=\{scroller\} className="absolute inset-0 overflow-y-auto overscroll-contain"/,
    );
  });
});

/**
 * The chooser shows the card that was picked.
 *
 * Arriving on `?mode=library` selects Classic and opens the category
 * picker in the same commit — and the row stayed at 0, so the selected card
 * sat off the right-hand edge of the screen (owner: "my selected game
 * option is hidden"). Two causes, both of them about timing: a smooth
 * scrollIntoView is a request that later work can win, and closing the
 * picker mounts a NEW row element that starts at 0 with the same card still
 * selected.
 */
describe("the picked card is brought into view", () => {
  const page = read("src/components/team/CreateRoomPage.tsx");

  it("instantly, and held for a moment against a settling overlay", () => {
    // Prose still tells the story; no CALL may ask for a smooth scroll.
    const code = page
      .split("\n")
      .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
      .join("\n");
    expect(code).not.toMatch(/behavior: "smooth"/);
    expect(code).toMatch(/behavior: "auto", inline: "start", block: "nearest"/);
    expect(page).toMatch(/row\.scrollLeft \+= el\.getBoundingClientRect\(\)\.left - row\.getBoundingClientRect\(\)\.left;/);
    expect(page).toMatch(/const deadline = performance\.now\(\) \+ 600;/);
  });

  it("again whenever the row itself is replaced", () => {
    expect(page).toMatch(/const \[rowEl, setRowEl\] = useState<HTMLDivElement \| null>\(null\);/);
    expect(page).toMatch(/setRowEl\(el\);/);
    expect(page).toMatch(/\}, \[gameChoice, rowEl\]\);/);
  });

  it("and yields to the player's own finger", () => {
    expect(page).toMatch(/row\?\.addEventListener\("pointerdown", stop/);
    expect(page).toMatch(/row\?\.addEventListener\("touchstart", stop/);
  });
});
