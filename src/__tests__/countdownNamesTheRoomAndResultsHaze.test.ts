/**
 * Two from one screenshot round (owner's asks).
 *
 *  - The 3-2-1 countdown names its room: the results screen's pill — the
 *    room's face, its name, and "Game N, Round N" under it — sits at the
 *    top of the count ("show room icon + title game-round info here too").
 *    The game/round reading moved into useMatchInfo so the countdown and
 *    the results screen say the same thing.
 *  - The results screen's footer floats over its list of seats behind the
 *    lobby's haze — the progressive blur under the lobby's Start — so the
 *    tiles keep going under the button, blurred, and the list pads its own
 *    bottom by the footer's measured height ("use same background blur
 *    behind the button what we use in lobby in bottom"). The haze is one
 *    component (FooterHaze) drawn by both.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const countdown = read("src/components/team/RoundCountdown.tsx");
const page = read("src/pages/TeamV2.tsx");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const lobby = read("src/components/lobby/UniversalLobby.tsx");
const haze = read("src/components/shared/FooterHaze.tsx");

describe("the countdown names its room", () => {
  it("takes the room's face, its name and the match", () => {
    expect(countdown).toMatch(/roomName\?: string \| null;\s*\n\s*roomIcon\?: string \| null;/);
    expect(countdown).toMatch(/matchInfo\?: \{ game: number; round: number \} \| null;/);
  });

  it("draws the results screen's pill at the top, under the safe area", () => {
    expect(countdown).toMatch(/className="absolute inset-x-0 top-\[calc\(12px_\+_var\(--safe-top,0px\)\)\] flex justify-center px-4"/);
    expect(countdown).toMatch(/rounded-full bg-white\/15 py-2 pl-3 pr-5 backdrop-blur-sm/);
    expect(countdown).toMatch(/t\("extra\.matchRoundLabel", \{ game: matchInfo\.game, round: matchInfo\.round \}\)/);
  });

  it("is handed the room and the match by the rooms page, from the shared reading", () => {
    expect(page).toMatch(/const roundMatchInfo = useMatchInfo\(currentRoom\?\.id, currentRoom\?\.current_game_id\);/);
    expect(page).toMatch(/roomName=\{currentRoom\.room_name \|\| t\("extra\.gameRoomLabel"\)\}\s*\n\s*roomIcon=\{currentRoom\.room_icon \?\? dealtRoomIcon\(currentRoom\.id, roomIconPool\)\}\s*\n\s*matchInfo=\{roundMatchInfo\}/);
    expect(results).toMatch(/const matchInfo = useMatchInfo\(currentRoom\?\.id, currentRoom\?\.current_game_id\);/);
    expect(results).not.toMatch(/\.from\("room_games"\)/);
  });
});

describe("the haze is one component", () => {
  it("drawn by the lobby and by the results screen, in each screen's own ground", () => {
    expect(lobby).toMatch(/<FooterHaze \/>/);
    expect(results).toMatch(/<FooterHaze tint=\{RESULTS_HAZE_TINT\} \/>/);
    expect(results).toMatch(/const RESULTS_HAZE_TINT = "155,137,245";/);
    expect(haze).toMatch(/export const LOBBY_HAZE_TINT = "249,219,255";/);
    expect(haze).toMatch(/export function FooterHaze\(\{ tint = LOBBY_HAZE_TINT \}: \{ tint\?: string \}\)/);
  });
});

describe("the results footer floats over the list", () => {
  it("anchored to the bottom, measured, with the list padded by its height plus the haze", () => {
    expect(results).toMatch(/<div ref=\{footerRef\} className="absolute inset-x-0 bottom-0 z-20">\s*\n\s*<FooterHaze tint=\{RESULTS_HAZE_TINT\} \/>/);
    expect(results).toMatch(/const FOOTER_HAZE_PX = 120;/);
    expect(results).toMatch(/const read = \(\) => setFooterHeight\(node\.getBoundingClientRect\(\)\.height\);/);
    expect(results).toMatch(/style=\{\{ paddingBottom: footerHeight \+ FOOTER_HAZE_PX \}\}/);
    // The shell is the footer's positioning parent.
    expect(results).toMatch(/className="relative w-full h-full flex flex-col max-w-\[700px\] mx-auto"/);
  });
});
