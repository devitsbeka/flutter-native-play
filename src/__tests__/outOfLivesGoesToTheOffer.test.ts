/**
 * Out of lives: the Play button opens the screen that says so.
 *
 * It navigated to the play chooser like any other tap, so a player with
 * nothing left picked a game, chose a category, and only found out at the
 * start of the round. The screen that explains it — an ad for one more, PRO
 * for no limit, and the countdown to the next free one — already existed and
 * was mounted on the home page; the button simply never opened it (owner:
 * "we should show this page to users who has 0 lives and they click play").
 *
 * And the button stops counting. It carried a "3/5" badge, a pulsing
 * hourglass-and-zero when they ran out, a turning hourglass on its face and
 * a sweeping ring around it — four pieces of chrome for a number nobody
 * decides anything with (owner: "don't show sand timer here, show just play
 * button without 0/5"). The PRO mark stays: it is not a count, it is the
 * hours left on a lapsing subscription.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const home = read("src/pages/Index.tsx");
const nav = read("src/components/layout/UniversalBottomNav.tsx");

describe("the tap with nothing left", () => {
  it("opens the limit screen instead of the chooser", () => {
    expect(home).toMatch(
      /if \(!canPlay && !isVip\) \{\s*\n\s*setShowGuestMaxPlaysModal\(true\);\s*\n\s*return;\s*\n\s*\}\s*\n\s*navigate\("\/create-room"\);/,
    );
  });

  it("and the handler is rebuilt when either of those changes", () => {
    // A stale closure here would send a player who just watched an ad back
    // to the same wall, or a player who just ran out into a dead game.
    expect(home).toMatch(/\}, \[user, navigate, startQuickGame, canPlay, isVip\]\);/);
  });

  it("the screen it opens is the one that offers the ways out", () => {
    expect(home).toMatch(/<PlayLimitModal\s*\n\s*isOpen=\{showGuestMaxPlaysModal\}/);
    // It needs the regen countdown to be able to say when the next one lands.
    expect(home).toMatch(/timeUntilNextPlay=\{timeUntilNextPlay\}/);
  });
});

describe("the button says nothing but Play", () => {
  it("no counter, no hourglass, no sweeping ring", () => {
    expect(nav).not.toMatch(/\{playsRemaining\}\/\{maxPlays\}/);
    expect(nav).not.toMatch(/Hourglass/);
    expect(nav).not.toMatch(/Progress ring for exhausted state/);
    // And the dead plumbing goes with them rather than sitting unused.
    expect(nav).not.toMatch(/const showExhausted =/);
  });

  it("but the PRO mark stays, because it is not a count", () => {
    expect(nav).toMatch(/isPlayButton && !isPlusIcon && isVip && \(/);
    expect(nav).toMatch(/<VipBadge vipExpiresAt=\{vipExpiresAt\} \/>/);
  });

  it("and the face is the play triangle in every state", () => {
    // Plus, then Play, then Home — no branch for an exhausted face any more.
    // The LAST "Icon" comment: the first belongs to the nav's plain buttons.
    const face = nav.slice(nav.lastIndexOf("{/* Icon */}"));
    expect(face.indexOf("isPlayButton ? (")).toBeGreaterThan(-1);
    expect(face.slice(0, face.indexOf("isPlayButton ? ("))).not.toMatch(/exhausted/);
  });

  it("the exhausted colour survives — it looks unplayable, and says why on tap", () => {
    expect(nav).toMatch(/: "exhausted"/);
  });
});
