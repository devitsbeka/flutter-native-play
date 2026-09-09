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
const meta = read("src/config/gameModeMeta.ts");

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

describe("what a card says it costs and who it seats", () => {
  // The head count came back. It was dropped when the shelf split into the
  // games you play alone and the games you play in a room — the halves were
  // held to answer "how many?" on the card's behalf — and the owner asked
  // for the number itself, beside a price, on every card.
  //
  // Both numbers are read from one table so this shelf and the home rail
  // cannot drift apart again, which is exactly what happened last time:
  // the rail kept its counts while the chooser had none.
  it.each(GAME_CHOICES)("%s has a head count and a price in the table", (mode) => {
    const row = meta.match(new RegExp(`${mode}: \\{ players: "([^"]+)", price: ([^}]+) \\}`));
    expect(row, mode).not.toBeNull();
    // 0-10 players, as a single number or a range.
    expect(row![1], mode).toMatch(/^(10|[0-9])(-(10|[0-9]))?$/);
  });

  it("prices every mode but My Trivias, which is your own questions", () => {
    expect(meta).toMatch(/mytrivias: \{ players: "1-10", price: null \}/);
    for (const mode of GAME_CHOICES.filter((m) => m !== "mytrivias")) {
      expect(meta, mode).toMatch(new RegExp(`${mode}: \\{ players: "[^"]+", price: REWARDS\\.GAME_STAKE \\}`));
    }
  });

  it("draws both badges on the chooser's card, price left and count right", () => {
    expect(create).toMatch(/const \{ price, players \} = GAME_MODE_META\[card\.key\];/);
    // The coin badge is skipped for a free mode rather than printing a zero.
    expect(create).toMatch(/\{price !== null && !busy && \(/);
    expect(create).toMatch(/absolute left-\[calc\(16\*var\(--u\)\)\] top-\[calc\(16\*var\(--u\)\)\]/);
    expect(create).toMatch(/absolute right-\[calc\(16\*var\(--u\)\)\] top-\[calc\(16\*var\(--u\)\)\]/);
    expect(create).toMatch(/playersIcon/);
    expect(create).toMatch(/coinIcon/);
  });

  it("the home rail reads its count off the same table", () => {
    const feed = read("src/components/home/MobileHomeFeed.tsx");
    expect(feed).toMatch(/GAME_MODE_META\[card\.key\]\.players/);
    // ...and no longer carries a hand-written copy of it.
    expect(feed).not.toMatch(/players: "1-10"/);
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
