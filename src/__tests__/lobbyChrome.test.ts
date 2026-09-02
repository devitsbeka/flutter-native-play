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
    // accepted invite lands on the right team. Nobody claims a seat by
    // tapping one: seats are dealt (owner's direction — an approved join
    // sits opposite the host without choosing), so the + only invites.
    expect(battle).toMatch(
      /const seatAction = \(team: TBTeam\) => \{\s*\n\s*inviteTeamRef\.current = team;\s*\n\s*setInviteOpen\(true\)/,
    );
    expect(battle).not.toMatch(/iAmClaiming/);
    expect(battle).not.toMatch(/claimSeatHint/);
  });

  it("a teamless arrival is seated automatically, opposite the host", () => {
    // The player approved while already in the lobby arrives teamless over
    // realtime: their own device sits them on the host's opposite bench,
    // and the host's device sweeps up anyone whose client never did.
    expect(battle).toMatch(/const oppositeBench = useMemo/);
    expect(battle).toMatch(/const target = isHost \? hostBench : oppositeBench;/);
    expect(battle).toMatch(/autoSeatRef\.current = true;\s*\n\s*void setTeam\(target\)/);
    expect(battle).toMatch(/sweptRef\.current\.add\(p\.user_id\);\s*\n\s*void manageSeat\(p\.user_id/);
    // A returning host is dealt a bench at the door too, not just in the
    // lobby: the context's assignSeat no longer skips the host.
    const context = read("src/contexts/TeamBattleContext.tsx");
    expect(context).toMatch(/if \(user\.id === row\.host_user_id\) \{\s*\n\s*const a = onSide\("a"\);/);
    expect(context).not.toMatch(/user\.id === row\.host_user_id \|\| \(hostTeam !== "a"/);
  });

  it("the couch reconciles with the database, and a ghost sits back down", () => {
    // A backgrounded webview misses realtime deletes: the lobby then drew a
    // player whose row was gone, while the public card truthfully said one.
    // A slow poll plus focus/visibility refetches heal the stale couch, and
    // a player whose own row vanished from a waiting room re-enters through
    // the same assigned-seat door — guarded so leaveRoom's own delete never
    // reseats the leaver.
    const context = read("src/contexts/TeamBattleContext.tsx");
    expect(context).toMatch(/window\.setInterval\(refresh, 20_000\)/);
    expect(context).toMatch(/window\.addEventListener\("focus", refresh\)/);
    expect(context).toMatch(/document\.addEventListener\("visibilitychange", refresh\)/);
    expect(context).toMatch(/leavingRef\.current \|\| seatsLoadedRef\.current !== room\.id/);
    expect(context).toMatch(/reseatAtRef\.current = Date\.now\(\);\s*\n\s*void enterRoomRow\(room\)/);
    expect(context).toMatch(/leavingRef\.current = true;/);
  });

  it("the board build never preload-validates images in a burst", () => {
    // A whole board's worth of image checks at once is exactly the traffic
    // shape that gets the edge proxy 429-throttled by Wikimedia (503s),
    // dropping good questions and looping "preparing the board" forever.
    // The match renders one question at a time; the card's onError covers
    // the rare miss.
    const context = read("src/contexts/TeamBattleContext.tsx");
    expect(context).toMatch(/skipImagePreload: true/);
    const service = read("src/services/questionService.ts");
    expect(service).toMatch(/skipImagePreload\s*\n?\s*\? ordered\.slice\(0, count\)/);
  });

  it("a tile ships at most the 30 questions the server accepts", () => {
    // tb_start_match validates 5..30 per tile (20260921210000); the fetch's
    // 40 is headroom for the seen-filter, not a tile size — sending it raw
    // was refused with "Tile 0 needs 5..30 questions, has 40".
    const context = read("src/contexts/TeamBattleContext.tsx");
    expect(context).toMatch(/asQuestions\(filled\.res\.questions\.slice\(0, 30\)\)/);
    expect(context).toMatch(/asQuestions\(superRes\.questions\.slice\(0, 30\)\)/);
    // And the guest's "waiting for the host" line sits at the TOP, under
    // the rounds caption, where a short window can't hide it.
    const battle = read("src/pages/TeamBattlePage.tsx");
    expect(battle).toMatch(/: !isHost \? \(\s*\n\s*<p[^]*?teamBattle\.waitingHost/);
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

describe("the couch elects its captain, like the arena", () => {
  it("the King's chip opens the vote sheet and the vote goes through the shared RPC", () => {
    // Tapping the captain chip opens the same CaptainInfoModal the arena
    // uses, with a live tally, and choosing casts a tb_vote_captain vote —
    // the one function that serves both lobbies since 20260925100000.
    expect(king).toMatch(/CaptainChip[^]*?onClick=\{\(\) => setCaptainInfoOpen\(true\)\}/);
    expect(king).toMatch(/<CaptainInfoModal[^]*?body=\{t\("king\.captainInfoBody"\)\}/);
    expect(king).toMatch(/supabase\.rpc\("tb_vote_captain"/);
    expect(king).toMatch(/voter\.captain_vote === p\.user_id/);
  });

  it("the host wears the armband only until somebody is voted in", () => {
    // Elected first, host as the fallback — the same order king_team_start
    // applies when it seats the duel's captain.
    expect(king).toMatch(
      /const kingCaptain =\s*\n\s*kingParts\.find\(\(p\) => p\.is_captain && !p\.is_bot\) \?\?\s*\n\s*kingParts\.find\(\(p\) => p\.is_host\)/,
    );
    expect(king).not.toMatch(/name=\{\(kingParts\.find\(\(p\) => p\.is_host\)/);
  });
});

describe("the host's side is the side they chose", () => {
  const battle = read("src/pages/TeamBattlePage.tsx");
  const ctx = read("src/contexts/TeamBattleContext.tsx");

  it("the crests picked on the create screen are written with the room row", () => {
    // Not through tb_set_team_icon after the fact: since 20260925100000 that
    // RPC dresses only the side the caller captains, and at creation the
    // host captains one side — the other side's pick was refused and the
    // lobby opened on the stock crests.
    expect(ctx).toMatch(/\.\.\.\(teamIcons\?\.a \? \{ team_a_icon: teamIcons\.a \} : \{\}\)/);
    expect(ctx).toMatch(/\.\.\.\(teamIcons\?\.b \? \{ team_b_icon: teamIcons\.b \} : \{\}\)/);
    expect(battle).toMatch(/createRoom\(publish, side, teamSize, teamIcons\)/g);
    expect(battle.match(/createRoom\(publish, side, teamSize, teamIcons\)/g)?.length).toBe(2);
    expect(battle).not.toMatch(/applyCrests/);
  });

  it("the host cannot move their own seat — no menu entry, no drag", () => {
    expect(battle).toMatch(/if \(isHost && p\.user_id !== user\?\.id\) \{/);
    expect(battle).toMatch(/draggable=\{isHost && entry\.p\.user_id !== user\?\.id\}/);
    expect(battle).toMatch(/if \(!toOther \|\| !isHost \|\| entry\.p\.user_id === user\?\.id\) return;/);
  });
});

describe("the King's duel keeps its one action at the bottom", () => {
  it("the shell is a column with a scrolling body and a pinned footer", () => {
    expect(king).toMatch(/const DUEL_SHELL =\s*\n\s*"[^"]*overflow-hidden[^"]*flex flex-col"/);
    expect(king).toMatch(/const DUEL_BODY = "flex-1 min-h-0 overflow-y-auto"/);
    expect(king).toMatch(/const DUEL_FOOTER = "shrink-0 max-w-md mx-auto w-full px-5 pt-3 pb-5"/);
    // Every CTA of the duel lives in a footer, none under the question.
    const footers = king.match(/<div className=\{DUEL_FOOTER\}>/g) ?? [];
    expect(footers.length).toBe(5);
    expect(king).not.toMatch(/<p className="text-sm text-white\/70 text-center -mt-2">\{t\("king\.thinkHint"\)\}<\/p>\s*<button/);
  });
});

describe("the match wears the sides' crests", () => {
  it("the score header shows each team's crest, the lobby's deal for an unchosen side", () => {
    const match = read("src/components/team-battle/TeamBattleMatch.tsx");
    expect(match).toMatch(/import \{ dealtCrests, fetchCrestPool \} from "@\/utils\/roomCrests"/);
    expect(match).toMatch(/dealtCrests\(room\?\.id \?\? "", crestPool, \{\s*a: room\?\.team_a_icon \?\? null,\s*b: room\?\.team_b_icon \?\? null,/);
    expect(match).toMatch(/src=\{crests\[team\] \?\? undefined\}/);
  });
});
