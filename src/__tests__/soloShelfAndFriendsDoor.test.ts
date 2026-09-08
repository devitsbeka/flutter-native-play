/**
 * The chooser opens on the games you can actually play alone.
 *
 * Tapping Play, or "+ Room", used to lay out all seven modes at once: four
 * you can play by yourself and three that are not a game until somebody
 * else turns up. Someone who taps Play wants to play, and half the shelf
 * was asking them to go and find a friend first (owner's ask).
 *
 * So the shelf has two halves. It opens on the solo one — Quick, Guess,
 * Words, and your own trivias — with one bar under it, "Play With Friends"
 * (Figma 1102:4271 open / 1106:5171 locked), that swaps in the modes that
 * need a room: Classic Trivia, your trivias again, and the two arenas while
 * they are developer-only. The bar is a door that shuts for two reasons: the
 * room modes are Pro, and a player with nothing left to play with cannot
 * start one either. Shut, it keeps its colour and hangs a padlock over the
 * three faces at its end.
 *
 * My Trivias is on BOTH halves on purpose — it is a real game either way.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GAME_CHOICES } from "@/components/team/CreateRoomPage";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const create = read("src/components/team/CreateRoomPage.tsx");

const crewOf = (mode: string) => {
  const m = create.match(new RegExp(`\\{ key: "${mode}", crew: "(solo|friends|both)"`));
  return m?.[1] ?? null;
};

describe("which half each mode sits on", () => {
  it.each([
    ["quick", "solo"],
    ["guess", "solo"],
    ["words", "solo"],
    ["mytrivias", "both"],
    ["library", "friends"],
    ["king", "friends"],
    ["battle", "friends"],
  ])("%s is on the %s shelf", (mode, crew) => {
    expect(crewOf(mode)).toBe(crew);
  });

  it("every declared mode has a half — none falls off the shelf", () => {
    for (const mode of GAME_CHOICES) {
      expect(crewOf(mode), `crew for ${mode}`).not.toBeNull();
    }
  });

  it("and the row draws only the half that is open", () => {
    expect(create).toMatch(
      /\.filter\(\(card\) => card\.crew === "both" \|\| card\.crew === \(friendsMode \? "friends" : "solo"\)\)/,
    );
  });
});

describe("no card carries a head count any more", () => {
  // Superseded. Every card used to wear a peach "how many play" pill in its
  // top-right corner, and My Trivias was given one because a blank corner
  // beside neighbours that answered "how many?" read as an answer of none.
  //
  // The redesigned card has no such layer (Figma 1102:3113, and its My Trivia
  // sibling 1102:3123): the shelf now splits into the games you play alone
  // and the games you play in a room, and which half you are looking at
  // answers the question the pill was answering. The count survives on the
  // home rail, where there are no halves to read it off.
  it.each(["quick", "guess", "words", "mytrivias", "library"])(
    "%s draws no pill on the chooser",
    (mode) => {
      const card = create.match(new RegExp(`\\{ key: "${mode}",[^}]*\\}`))?.[0] ?? "";
      expect(card, mode).not.toMatch(/players:/);
    },
  );

  it("and the pill itself is gone, not merely unfed", () => {
    expect(create).not.toMatch(/playersIcon/);
  });

  it("the home rail keeps its own count", () => {
    const feed = read("src/components/home/MobileHomeFeed.tsx");
    expect(feed).toMatch(/\{ key: "mytrivias", art: featuredMyTrivias, players: "1-10",/);
  });
});

describe("the Play With Friends door", () => {
  it("is a Pro gate, not a plain toggle", () => {
    expect(create).toMatch(/requirePro\("rooms", \(\) => \{ setFriendsMode\(true\); setGameChoice\(null\); \}\)/);
    // And the paywall it opens is actually mounted.
    expect(create).toMatch(/<ProPaywallModal isOpen=\{showProModal\} onClose=\{\(\) => setShowProModal\(false\)\} \/>/);
  });

  it("wears the Figma's one skin, locked or not", () => {
    // Open (1102:4271) and locked (1106:5171) are the SAME bar: the
    // teal-to-lilac wash, the #b3dfdb rim, the #c8d2ee foot. Turning the
    // locked one white and grey — which is what shipped — read as a disabled
    // control rather than as a door worth opening.
    expect(create).toMatch(/border-\[#b3dfdb\] bg-gradient-to-r from-\[#def5f5\] to-\[#f0e6ff\]/);
    expect(create).toMatch(/shadow-\[0px_8px_0px_0px_#c8d2ee\]/);
    expect(create).not.toMatch(/border-\[#919191\] bg-white/);
    // Locked is the faces dimmed to 40% under a 68px padlock (1112:8157).
    expect(create).toMatch(/friendsLocked && "opacity-40"/);
    expect(create).toMatch(/src=\{lockRender\}/);
    expect(create).toMatch(/h-\[68px\] w-\[68px\]/);
  });

  it("and it locks for either reason it can be shut", () => {
    // Pro is one; nothing left to play with is the other — 1102:5148 is the
    // same screen as 1102:2121 with the counters run down and this bar
    // padlocked.
    expect(create).toMatch(/const friendsLocked = !isVip \|\| blockedByLimit;/);
  });

  it("only stands on the solo half, where it has something to offer", () => {
    expect(create).toMatch(/\{!friendsMode && \(\s*\n\s*<button/);
  });

  it("says the words the app already translates", () => {
    expect(create).toMatch(/t\("extra\.playWithFriendsFeature"\)/);
    for (const locale of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${locale}.ts`), locale).toMatch(/playWithFriendsFeature:/);
    }
  });

  it("draws no faces when there are no friends to draw", () => {
    // Three strangers on a "play with friends" bar would be inventing them —
    // the same mistake the lobby's invite line made. The row is always
    // rendered now because the padlock hangs in it, so the guard is that
    // nothing but real friends is ever mapped into it.
    expect(create).toMatch(/\{friendFaces\.map\(\(friend, i\) => \(/);
    expect(create).not.toMatch(/placeholderFaces|fallbackFaces/);
  });
});

describe("getting back out", () => {
  it("the back arrow closes the friends half before it closes the screen", () => {
    const arrow = create.slice(create.indexOf("if (guessPicking) return setGameChoice(null);"));
    const friends = arrow.indexOf("if (friendsMode) {");
    const leave = arrow.indexOf('if (ownsRoute) return navigate("/");');
    expect(friends).toBeGreaterThan(-1);
    expect(friends).toBeLessThan(leave);
  });

  it("a deep link to a friends-only mode opens on that half", () => {
    // Otherwise the mode it seeds would have no card to run.
    expect(create).toMatch(/friendsOnlyMode\(initialMode\) \|\|/);
    expect(create).toMatch(
      /key === "library" \|\| key === "king" \|\| key === "battle"/,
    );
  });
});
