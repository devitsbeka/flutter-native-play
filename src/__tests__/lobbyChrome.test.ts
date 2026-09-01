/**
 * The lobby's furniture: the friends reel, the room's name, the title.
 *
 * All three used to compete for the top of the screen. The reel sat under
 * the header on every visit whether or not anyone was inviting, the room's
 * name sat under that and read as a second title, and the real title hung
 * off the back arrow. The rules below are what replaced them, and each one
 * is easy to undo by accident:
 *
 *  - the reel is opened by a + seat, not rendered unconditionally;
 *  - the room's name lives one row above the captains, in the middle;
 *  - the game's name is centred in the header at every width.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const king = read("src/pages/KingPage.tsx");
const battle = read("src/pages/TeamBattlePage.tsx");
const lilac = read("src/components/lobby/LilacLobby.tsx");
const room = read("src/components/team/RoomLobbyV2.tsx");

describe("the friends reel waits to be asked for", () => {
  it("both lounges gate it behind their own open flag", () => {
    for (const src of [king, battle]) {
      expect(src).toMatch(/const \[reelOpen, setReelOpen\] = useState\(false\)/);
      // Rendered only when open — an unconditional <FriendsStoriesBar/> is
      // exactly the thing this replaced.
      expect(src).toMatch(/\{reelOpen && \(/);
    }
  });

  it("a + seat is what opens it", () => {
    // King's plus seats toggle the reel directly; the arena's go through
    // seatAction, which also remembers the team the seat belonged to.
    expect(king).toMatch(/PlusSeat[^]*?onClick=\{\(\) => setReelOpen\(\(v\) => !v\)\}/);
    expect(battle).toMatch(
      /const seatAction = \(team: TBTeam\) => \{\s*\n\s*inviteTeamRef\.current = team;\s*\n\s*setReelOpen/,
    );
  });

  it("the reel's own + still reaches the full invite modal", () => {
    // Otherwise the search, the link and the share sheet become unreachable
    // from the lounge.
    expect(king).toContain("onAddFriendClick={inviteFriends}");
    expect(battle).toContain("onAddFriendClick={() => setInviteOpen(true)}");
  });
});

describe("the room's name sits above the captain row", () => {
  it("the King's name is below its seats, above the captain label", () => {
    // Design coordinates inside the FitBox: name, then label, then chip,
    // in that order and none of them overlapping.
    expect(king).toContain('top-[590px] w-[435px] flex justify-center');
    expect(king).toContain("top-[638px]"); // captain label
    expect(king).toContain("top={668}"); // captain chip
    // The canvas grew to hold the moved block; the chip's bottom (668+52)
    // has to still be inside it.
    expect(king).toContain("<FitBox width={500} height={728}>");
    expect(king).not.toContain('top-[44px] w-[435px]');
  });

  it("the arena's name shares the team-names row, one row above the captains", () => {
    expect(battle).toContain('top-[404px] h-[40px] w-[441px] flex items-center justify-between');
    // Not centred on top of the team names but between them, so a long
    // Italian team name narrows the pill instead of colliding with it.
    expect(battle).toMatch(/min-w-0 inline-flex items-center gap-2 max-w-\[220px\]/);
    expect(battle).not.toContain('top-[6px] w-[435px]');
  });
});

describe("the game's name is centred in the header", () => {
  it("the lilac header centres its title over the whole row", () => {
    expect(lilac).toContain("pointer-events-none absolute inset-0 flex items-center justify-center");
    // A size down from the 26px it wore beside the back arrow.
    expect(lilac).toMatch(/leading-\[28px\] not-italic text-\[24px\]/);
    expect(lilac).not.toContain("text-[26px] tracking-[-0.16px] whitespace-nowrap");
  });

  it("the classic room centres its name at every width, not only on md+", () => {
    expect(room).toContain("flex min-w-0 flex-[2] items-center justify-center gap-2 px-1");
    expect(room).toContain('<h2 className="truncate text-sm font-bold text-white drop-shadow-lg">');
    // The two ends take an equal share, which is what makes the middle the
    // real middle rather than what is left over.
    expect(room).toContain('<div className="flex shrink-0 flex-1 items-center">');
    expect(room).toContain('<div className="flex shrink-0 flex-1 items-center justify-end gap-2">');
    expect(room).not.toMatch(/md:flex-\[2\]/);
  });
});
