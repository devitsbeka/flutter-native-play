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
 * (Figma 1102:4545 open / 1102:6045 locked), that swaps in the modes that
 * need a room: Classic Trivia, your trivias again, and the two arenas while
 * they are developer-only. The bar is a Pro door: coloured and pressable
 * for a subscriber, white and padlocked for everyone else.
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

describe("the Play With Friends door", () => {
  it("is a Pro gate, not a plain toggle", () => {
    expect(create).toMatch(/requirePro\("rooms", \(\) => \{ setFriendsMode\(true\); setGameChoice\(null\); \}\)/);
    // And the paywall it opens is actually mounted.
    expect(create).toMatch(/<ProPaywallModal isOpen=\{showProModal\} onClose=\{\(\) => setShowProModal\(false\)\} \/>/);
  });

  it("wears the Figma's two skins", () => {
    // Open (1102:4271): the teal-to-lilac wash on a #c8d2ee foot.
    expect(create).toMatch(/from-\[#def5f5\] to-\[#f0e6ff\] shadow-\[0px_8px_0px_0px_#c8d2ee\]/);
    // Locked (1106:5171): white on a grey foot, with the padlock.
    expect(create).toMatch(/border-\[#919191\] bg-white shadow-\[0px_8px_0px_0px_#919191\]/);
    expect(create).toMatch(/src=\{lockRender\}/);
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
    // the same mistake the lobby's invite line made.
    expect(create).toMatch(/\{friendFaces\.length > 0 && \(/);
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
