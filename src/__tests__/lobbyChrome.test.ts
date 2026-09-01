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

describe("the lounges invite through the invite page", () => {
  it("neither lounge carries the friends reel", () => {
    // It was tried both ways: always on (a permanent bite out of a screen
    // that has to fit two teams, the captains and the CTA) and behind the
    // + seats. Both put a second, weaker way in beside the real one — the
    // invite page, which has search, the link and the share sheet.
    for (const src of [king, battle]) {
      expect(src).not.toMatch(/FriendsStoriesBar/);
      expect(src).not.toMatch(/reelOpen/);
    }
  });

  it("a + seat opens the invite page", () => {
    expect(king).toMatch(/PlusSeat[^]*?onClick=\{inviteFriends\}/);
    // The arena's + also remembers which side the seat was on, so an
    // accepted invite lands on the right team.
    expect(battle).toMatch(
      /const seatAction = \(team: TBTeam\) => \{\s*\n\s*inviteTeamRef\.current = team;\s*\n\s*setInviteOpen\(true\)/,
    );
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

  it("the arena has no name of its own to place", () => {
    // It is called Trivia Battle. The AI namer, the rename sheet and the
    // pill that showed the result are all gone; the two SIDES are what
    // carry an identity here, and their captains choose it.
    expect(battle).not.toMatch(/generate-room-name/);
    expect(battle).not.toMatch(/setRenameOpen/);
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
