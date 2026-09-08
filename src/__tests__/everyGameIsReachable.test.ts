/**
 * Every game is reachable, from both places, and every way out lands.
 *
 * There are seven modes and two front doors — the home feed's Play rail and
 * the chooser ("What will you play?") — and the two are meant to be the same
 * list of cards. A mode that exists in one and not the other, or whose card
 * leads to a route that is not mounted, is invisible or dead rather than
 * broken in a way anyone would notice.
 *
 * This walks the surface: card → startMode → destination → route. It is a
 * structural check, not a behavioural one; it cannot prove a game plays, only
 * that nothing on the way to it is missing.
 *
 * The chooser draws its cards on two halves now — solo, and the Pro "Play
 * With Friends" door — so a card being IN the file is no longer the same as
 * it being on screen at any given moment. Which half each mode sits on is
 * pinned in soloShelfAndFriendsDoor.test.ts; what matters here is that the
 * card exists at all and that what it starts is mounted.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GAME_CHOICES } from "@/components/team/CreateRoomPage";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const create = read("src/components/team/CreateRoomPage.tsx");
const feed = read("src/components/home/MobileHomeFeed.tsx");
const app = read("src/App.tsx");
const createRoomPage = read("src/pages/CreateRoom.tsx");

/** Every `path=` mounted in the router. */
const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
const routeExists = (path: string) =>
  routes.includes(path) ||
  routes.some((r) => {
    if (!r.includes(":")) return false;
    return new RegExp(`^${r.replace(/:[^/]+/g, "[^/]+")}$`).test(path);
  });

describe("the seven modes", () => {
  it("are the same seven the union declares", () => {
    expect([...GAME_CHOICES].sort()).toEqual(
      ["battle", "guess", "king", "library", "mytrivias", "quick", "words"].sort(),
    );
  });

  it.each([...GAME_CHOICES])("%s has a card in the chooser and on the home rail", (mode) => {
    // The rail's comment promises "same art, same order, same gating".
    expect(create, `chooser card for ${mode}`).toMatch(new RegExp(`key: "${mode}"`));
    expect(feed, `home rail card for ${mode}`).toMatch(new RegExp(`key: "${mode}"`));
  });

  it("and the home rail's cards open the chooser on that mode", () => {
    expect(feed).toMatch(/onClick=\{\(\) => navigate\(`\/create-room\?mode=\$\{card\.key\}`\)\}/);
    // The page only honours a mode it recognises, from the same list.
    expect(createRoomPage).toMatch(/\(GAME_CHOICES as readonly string\[\]\)\.includes\(modeParam \?\? ""\)/);
    expect(routeExists("/create-room")).toBe(true);
  });
});

describe("every destination is mounted", () => {
  it.each([
    ["quick", "/game"],
    ["king", "/king"],
    ["battle", "/team-battle"],
    ["words", "/words"],
    ["library / mytrivias", "/team"],
    ["guess", "/play/x/1"],
  ])("%s → %s", (_mode, path) => {
    expect(routeExists(path), `no route for ${path}`).toBe(true);
  });

  it("and each mode's hand-off names one of them", () => {
    expect(create).toMatch(/handoff\("\/game"\)/);
    expect(create).toMatch(/handoff\(gameChoice === "king" \? "\/king" : "\/team-battle"/);
    expect(create).toMatch(/handoff\("\/words", \{ state: \{ invite \} \}\)/);
    expect(create).toMatch(/handoff\(`\/team\?join=\$\{\w+\}`/);
    expect(create).toMatch(/handoff\(`\/play\/\$\{cat\.category_id \?\? cat\.id\}\/\$\{level\}`/);
  });
});

describe("back goes where you came from", () => {
  it("home when this screen IS the page, otherwise back to what it opened over", () => {
    // It went to "/" both ways. Opened by the Create button on the
    // online-game page, that threw the player off the rooms list they were
    // standing on and back to the top of the app.
    expect(create).toMatch(/if \(ownsRoute\) return navigate\("\/"\);\s*\n\s*onClose\(\);/);
    expect(create).not.toMatch(/onClick=\{\(\) => \(guessPicking \? setGameChoice\(null\) : navigate\("\/"\)\)\}/);
  });

  it("and the Guess question closes before the screen does", () => {
    expect(create).toMatch(/if \(guessPicking\) return setGameChoice\(null\);/);
  });

  it("the standalone page replaces its own history entry when it hands off", () => {
    // So the back button from a game does not land on the chooser that
    // started it, which would restart the same game.
    expect(create).toMatch(/navigate\(to, \{ \.\.\.options, replace: ownsRoute \}\)/);
    expect(createRoomPage).toMatch(/ownsRoute/);
  });
});

describe("nothing waits on the chooser it has already left", () => {
  it("the modes that navigate straight out do so in one handler", () => {
    // quick, king, battle and words have no room to create, so there is
    // nothing to await between closing and navigating: both land in the same
    // commit and neither can paint the chooser in between.
    for (const m of [/if \(gameChoice === "quick"\) \{\s*\n\s*onClose\(\);\s*\n\s*handoff\("\/game"\);/,
                     /if \(gameChoice === "words"\) \{[\s\S]{0,200}?onClose\(\);\s*\n\s*handoff\("\/words"/]) {
      expect(create).toMatch(m);
    }
  });

  it("and the ones that DO create a room hold the spinner while they do", () => {
    // Library and My Trivia write a room before they can navigate; the
    // handoff state paints the lobby's spinner over this screen for that
    // whole round trip rather than handing the chooser back.
    expect(create).toMatch(/const \[handingOff, setHandingOff\] = useState\(false\);/);
    expect(create).toMatch(/\{handingOff \? \(/);
    expect(create).toMatch(/const HANDOFF_MAX_MS = 10000;/);
  });
});
