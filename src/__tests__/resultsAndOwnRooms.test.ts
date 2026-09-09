/**
 * Four things the owner found in one round of play.
 *
 *  - the winner wore a crown, and a crown means HOST everywhere else;
 *  - a player who left and came back was told they came last;
 *  - the Players tab listed a 680 above three zeroes, fourth;
 *  - a public room they hosted could not be found under "My Rooms".
 *
 * Different screens, one shape: a number or a badge asserting something the
 * screen did not actually know.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const myRooms = read("src/hooks/useMyRooms.ts");
const scoreboard = read("src/components/team/RoomScoreboard.tsx");

describe("the crown means host, and only host", () => {
  it("the results row does not draw one on the winner", () => {
    expect(results).not.toMatch(/idx === 0 && \(\s*\n\s*<Crown/);
    expect(results).not.toMatch(/<Crown className="absolute -top-3/);
  });

  it("while the places it DOES mean host keep it", () => {
    // The lobby scoreboard and the room cards; this is the meaning the
    // results screen was borrowing.
    expect(scoreboard).toMatch(/showHostCrown && player\.is_host/);
  });

  it("and the medal still says who won", () => {
    expect(results).toMatch(/idx === 0 \? "🥇"/);
  });
});

describe("a place is only claimed when it is known", () => {
  it("a viewer whose row is not here has no rank rather than the last one", () => {
    // A player who leaves and comes back reaches this screen before their
    // participant row is read back. `?? rankedParticipants.length` reported
    // that as last place — the winner was told they came fourth over a list
    // showing them first.
    expect(results).toMatch(/const myRank = myParticipant\?\.rank \?\? null;/);
    expect(results).not.toMatch(/myParticipant\?\.rank \?\? rankedParticipants\.length/);
  });

  it("and the headline says something true instead", () => {
    expect(results).toMatch(/myRank === null\s*\n\s*\? \/\//);
    expect(results).toMatch(/t\("extra\.gameOver"\)/);
    // The podium check cannot treat null as a place either.
    expect(results).toMatch(/const isPodium = myRank !== null && myRank <= 3;/);
  });

  it("but the payout is left exactly as it was", () => {
    // Still last when the row is missing — the smallest reward. Paying out
    // on a guess should err downwards, and the money is not what was
    // reported broken.
    expect(results).toMatch(/const myRankForPayout = myRank \?\? rankedParticipants\.length;/);
    expect(results).toMatch(/myRank: myRankForPayout,/);
  });
});

describe("the Players tab is a scoreboard, so it is ordered like one", () => {
  it("highest score first, not join order", () => {
    expect(lobby).toMatch(/const rankedParticipants = \[\.\.\.participants\]\.sort\(\(a, b\) => \{/);
    expect(lobby).toMatch(/return \(b\.total_score \|\| 0\) - \(a\.total_score \|\| 0\);/);
    expect(lobby).toMatch(/const lobbyPlayers: LobbyPlayer\[\] = rankedParticipants\.map\(\(p\) => \(\{/);
    expect(lobby).not.toMatch(/const lobbyPlayers: LobbyPlayer\[\] = participants\.map/);
  });

  it("with unanswered invitations at the end, having no score to rank", () => {
    expect(lobby).toMatch(/if \(pendingA !== pendingB\) return pendingA - pendingB;/);
  });
});

describe("your own room is on whichever tab you look at", () => {
  it("the Private tab keeps the rooms you host, published or not", () => {
    expect(myRooms).toMatch(/result = result\.filter\(\(room\) => !room\.is_public \|\| room\.is_host\)/);
  });

  it("and still hides everyone else's published rooms", () => {
    // The tabs are for sorting other people's rooms; that job is unchanged.
    expect(myRooms).toMatch(/if \(visibility === "private"\) \{/);
    expect(myRooms).toMatch(/case "my_rooms":\s*\n\s*result = result\.filter\(\(room\) => room\.is_host\);/);
  });
});

describe("the place numbers are quieter than the medals", () => {
  it("smaller from fourth down", () => {
    // An emoji carries padding inside its own glyph, so type set to match a
    // medal optically overshoots: "#4" at 24px was the loudest thing on the
    // row it matters least on. The medals live on the podium now — the
    // winner's a size up from the two beside it — and the place numbers in
    // the list under it stay at body size.
    // The design's sizes now (Figma 1157:10036, resultsScreenFigma.test.ts):
    // the winner's medal at 46px hanging off the ring, the two beside it
    // at 32, and "#4" at 20px in the tile's violet.
    expect(results).toMatch(/first \? "-bottom-\[23px\] text-\[46px\]" : "-bottom-\[16px\] text-\[32px\]"/);
    expect(results).toMatch(/w-\[44px\] shrink-0 text-center font-display text-\[20px\] font-bold uppercase text-\[#6350c9\]/);
    expect(results).not.toMatch(/className="text-2xl font-display font-bold text-white min-w-\[2ch\]/);
  });
});
