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
 *  - the room's name is the universal lobby's title, over the scene;
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

  it("the invite row opens the invite page", () => {
    // The King's couch is the universal lobby now; its "Invite" row is the
    // one door to the invite page.
    expect(king).toMatch(/onInvite=\{inviteFriends\}/);
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

  it("nor does a room's round start — it warms the pictures instead", () => {
    // The same validation pass, on the same critical path, one screen over:
    // it downloads every one of the round's pictures IN FULL before it will
    // return them. On a picture category — guess the flag, the logo, the
    // city — every question has one, so a 10-question round fetched about
    // 1.6 MB before the room could even be told a round was starting. That
    // was the multi-second wait between tapping a picture game and the
    // countdown.
    const mp = read("src/contexts/MultiplayerContextV2.tsx");
    expect(mp).toMatch(/skipImagePreload: true,/);
    // Warmed rather than skipped: every picture is started, and the FIRST is
    // waited for — but at the flip to "playing", so the writes pay for the
    // wait instead of the player. Fire-and-forget was tried and was not
    // enough: an Image nobody holds can be collected mid-flight once the
    // create screen navigates away, and question one arrived cold anyway —
    // the one card that opens on a cold connection and an edge MISS, which
    // is why it was the only one showing "The picture didn't load".
    expect(mp).toMatch(/const pendingWarm = warmQuestionImages\(questions\.map\(q => q\.imageUrl\)\);/);
    expect(mp).toMatch(/if \(pendingWarm\) await pendingWarm;/);
    // Awaited BEFORE the room goes to "playing", not after.
    const flip = mp.indexOf('status: "playing",\n        started_at: roundStartedAt');
    expect(flip).toBeGreaterThan(-1);
    expect(mp.indexOf("if (pendingWarm) await pendingWarm;")).toBeLessThan(flip);
    expect(mp).toMatch(/import \{ warmQuestionImages \} from "@\/utils\/questionImage";/);
    // The warm helper waits only for the FIRST image, and only briefly — it
    // resolves either way, because a picture that refuses is the card's to
    // report, not this path's to block on.
    const img = read("src/utils/questionImage.ts");
    expect(img).toMatch(/firstImageDeadlineMs = 2000/);
    expect(img).toMatch(/img\.onerror = \(\) => resolve\(\);/);
  });

  it("a side has a NAME, dealt plural and renamed only by its captain", () => {
    // "Team A" told nobody anything: the randomizer deals plural names
    // (owner's rule) written with the room row, the lobby shows them, and
    // the crest picker's name field renames through the captain-only RPC —
    // with the AI room-namer silenced so it never fights the captain.
    const sql = read("supabase/migrations/20260929100000_team_names.sql");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS team_a_name text/);
    expect(sql).toMatch(/only that team''s captain names it/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.tb_set_team_name\(uuid, text, text\) FROM PUBLIC, anon;/);
    const gen = read("src/utils/teamNameGenerator.ts");
    expect(gen).toMatch(/პინგვინები/);
    expect(gen).toMatch(/არწივთა კლანი/);
    expect(gen).toMatch(/მებრძოლთა გუნდი/);
    expect(battle).toMatch(/const teamName = \(team: TBTeam\)/);
    expect(battle).toMatch(/supabase\.rpc\("tb_set_team_name"/);
    expect(battle).toMatch(/autoName=\{false\}/);
    const context = read("src/contexts/TeamBattleContext.tsx");
    // The name columns ride the room insert only once the migration is
    // live — an insert naming an unknown column writes nothing at all, so
    // the spread is probe-gated like is_public (roomVisibility.ts).
    expect(context).toMatch(/\.\.\.\(await teamNameFields\(teamNames\)\)/);
    const gate = read("src/utils/roomVisibility.ts");
    expect(gate).toMatch(/select\("team_a_name"\)\.limit\(1\)/);
    const match = read("src/components/team-battle/TeamBattleMatch.tsx");
    expect(match).toMatch(/room\?\.team_a_name : room\?\.team_b_name/);
  });

  it("a tile ships at most the 30 questions the server accepts", () => {
    // tb_start_match validates 5..30 per tile (20260921210000); the fetch's
    // 40 is headroom for the seen-filter, not a tile size — sending it raw
    // was refused with "Tile 0 needs 5..30 questions, has 40".
    const context = read("src/contexts/TeamBattleContext.tsx");
    expect(context).toMatch(/asQuestions\(filled\.res\.questions\.slice\(0, 30\)\)/);
    // The super round is not a tile: it is a race to three and ships five,
    // the server's own floor. See superRoundLength.test.ts.
    expect(context).toMatch(/asQuestions\(superRes\.questions\.slice\(0, 5\)\)/);
    // And the guest's "waiting for the host" line is the caption of the
    // universal lobby's Start footer, which is pinned to the bottom of a
    // fixed-height screen — never below a fold.
    const battle = read("src/pages/TeamBattlePage.tsx");
    expect(battle).toMatch(/caption: t\("teamBattle\.waitingHost"\)/);
  });
});

describe("the room's name sits above the captain row", () => {
  it("the King's name is the universal lobby's title, and the host can rename it", () => {
    // One lobby for every mode (Figma 1018:5815): the couch hands its name
    // and its own scene to UniversalLobby rather than placing it on a
    // FitBox canvas of its own.
    expect(king).toContain("<UniversalLobby");
    expect(king).toMatch(/sceneArt=\{LOBBY_SCENES\.king\}/);
    expect(king).toMatch(/onRename=/);
    expect(king).not.toContain("<FitBox width={500}");
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

  it("the classic room hands its name to the universal lobby, which sets it over the scene", () => {
    // The classic room no longer draws a header of its own: it renders the
    // one lobby every mode shares (Figma 1018:5815) and passes the name in.
    expect(room).toContain("<UniversalLobby");
    expect(room).toMatch(/roomName=\{roomName\}/);
    expect(room).not.toContain('<h2 className="truncate text-sm font-bold text-white drop-shadow-lg">');
    expect(room).not.toMatch(/md:flex-\[2\]/);
  });
});

describe("the couch elects its captain, like the arena", () => {
  it("the King's chip opens the vote sheet and the vote goes through the shared RPC", () => {
    // Tapping the armband opens the same CaptainInfoModal the arena uses,
    // with a live tally, and choosing casts a tb_vote_captain vote — the one
    // function that serves both lobbies since 20260925100000.
    //
    // The trigger moved: the couch used to state the captain in a cell of its
    // own under the players, and that cell was the way in. The armband now
    // sits on the captain's own row and carries the vote with it, so what is
    // guarded here is the wiring, not the chip that used to hold it.
    expect(king).toMatch(/onCaptainPress: \(\) => setCaptainInfoOpen\(true\)/);
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
    expect(battle).toMatch(/createRoom\(publish, side, teamSize, teamIcons, teamNamesRef\.current\)/g);
    expect(battle.match(/createRoom\(publish, side, teamSize, teamIcons, teamNamesRef\.current\)/g)?.length).toBe(2);
    expect(battle).not.toMatch(/applyCrests/);
  });

  it("the host cannot move their own seat — no menu entry, no drag", () => {
    expect(battle).toMatch(/if \(isHost && p\.user_id !== user\?\.id\) \{/);
    // The benches are rows of the universal lobby now: the seat menu is
    // the one way to reseat anyone, and there is no drag to sneak past it.
    expect(battle).not.toMatch(/draggable=/);
    expect(battle).toMatch(/if \(isHost && p\.user_id !== user\?\.id\) \{\s*\n\s*setSeatMenu\(\{ p, pending \}\);/);
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

  it("the duel plays on the light ground the frame gives it", () => {
    // Figma 1072:6642. It used to be the game screens' periwinkle, which
    // made every label on the screen white text floating on purple.
    expect(king).toMatch(/bg-\[#f7e2f7\] flex flex-col/);
    // Nothing is drawn for a dark ground any more — the three survivors are
    // the white tick on the green chip, the white cross on the red one, and
    // the number on the blue clock.
    expect(king.match(/text-white/g) ?? []).toHaveLength(3);
    expect(king).not.toMatch(/text-white\/70/);
    expect(king).not.toMatch(/text-emerald-300|text-red-300|text-amber-300/);
  });

  it("the header names the game; the scoreboard carries the two sides", () => {
    // The header used to bill the match like a fight card — "Trivia King VS
    // <team>", mascot and crest inline — which on a long team name pushed
    // the player chip off the row and repeated, badly, what the scoreboard
    // directly under it says properly.
    expect(king).toMatch(/font-slackey text-\[16px\][^"]*text-\[#402666\]/);
    expect(king).not.toMatch(/king\.vsTitle/);
    // The couch always has a face: the one the host dressed it in, else the
    // one dealt from its room id — the same deck its card and lobby use, not
    // the mascot, which would put the King on both sides of the score.
    expect(king).toMatch(
      /teamIcon=\{kingRoom\?\.room_icon \?\? dealtRoomIcon\(kingRoom\?\.id \?\? "", iconPool\)\}/,
    );
    expect(king).toMatch(/teamIcon=\{teamIcon\}/);
    // Names at 20, scores at 32 in the display face, rule between them.
    expect(king).toMatch(/text-\[32px\] leading-\[28px\] text-\[#402666\]/);
    expect(king).toMatch(/grid-cols-\[1fr_auto_1fr\] items-center pt-1/);
  });

  it("an answer is a key on a block, and the clock is a badge", () => {
    // A white 60px row over a #cbd5e1 rectangle offset four pixels down —
    // a block, not a blur — with a 36px lilac letter chip.
    expect(king).toMatch(/absolute inset-x-0 top-\[4px\] h-\[60px\] rounded-\[20px\] bg-\[#cbd5e1\]/);
    expect(king).toMatch(/rounded-\[16px\] bg-\[#eadffb\][^"]*text-\[#705c8c\]/);
    // The count was a bare 3xl monospace number under the card, in white.
    expect(king).not.toMatch(/font-mono text-3xl/);
    expect(king).toMatch(/function DuelTimerBadge/);
    expect(king).toMatch(/<DuelTimerBadge seconds=\{commitSeconds\} urgent \/>/);
  });

  it("the reveal reads as rows, and the host still dresses the team", () => {
    // Both rows now carry the SAME chip in two colours — the 3D cross that
    // used to mark a miss sat next to a flat disc and made the two rows
    // look like different kinds of statement. See kingReveal.test.ts.
    expect(king).toMatch(/tone === "right" \? "bg-\[#34d399\]" : "bg-\[#ff4606\]"/);
    expect(king).not.toMatch(/answer-wrong-3d\.png/);
    expect(king).not.toMatch(/answer-correct-3d\.png/);
    expect(king).toMatch(/<RoomIconPickerModal[^]*?autoName=\{false\}/);
    expect(king).toMatch(/size=\{68\}/);
    expect(king).toMatch(/size=\{47\}/);
  });

  it("the card's shoulders carry the number and the clock", () => {
    // The question number used to be a grey caption above the card, which
    // cost a line and left the clock up there looking like the only thing
    // worth knowing. They balance now, and the card is padded to clear both.
    expect(king).toMatch(/function DuelQuestionNo/);
    expect(king).toMatch(/absolute left-\[14px\] top-\[16px\][^"]*bg-\[#eadffb\]/);
    expect(king).toMatch(/<DuelQuestionNo label=\{t\("king\.questionNo", \{ n: state\.question_number \}\)\} \/>/);
    expect(king).toMatch(/<DuelQuestionNo label=\{t\("king\.questionNo", \{ n: view\.question_number \}\)\} \/>/);
    expect(king).toMatch(/rounded-\[24px\] p-5 pt-\[52px\]/);
    // And the score no longer sits on the card's roof.
    expect(king).not.toMatch(/flex flex-col gap-3 mt-1"/);
  });

  it("the King speaks Georgian in Georgian", () => {
    // "ტყის კლანი … King" was half a scoreboard in each language. The King
    // as a CHARACTER is მეფე; the GAME keeps its brand name (lobby.vkTitle),
    // which is spelled the same way in all seven.
    const ka = read("src/locales/ka.ts");
    expect(ka).toMatch(/\n\s{4}king: "მეფე",/);
    expect(ka).toMatch(/kingScores: "ქულა მეფეს ერგო"/);
    expect(ka).not.toMatch(/teamWon: "[^"]*King/);
    expect(ka).not.toMatch(/kingWon: "[^"]*King/);
    // The duel header says what the rest of the app calls this game, rather
    // than a string used nowhere else.
    expect(king).toMatch(/\{t\("lobby\.vkTitle"\)\}/);
    expect(king).not.toMatch(/t\("king\.title"\)/);
  });

  it("and the team is told to pick, not that the captain decides", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).not.toMatch(/teamSuggestHint: "[^"]*—/);
    }
    expect(read("src/locales/ka.ts")).toMatch(/teamSuggestHint: "აირჩიე შენი ვერსია პასუხებიდან"/);
  });
});

describe("the match wears the sides' crests", () => {
  it("the score header shows each team's crest, the lobby's deal for an unchosen side", () => {
    const match = read("src/components/team-battle/TeamBattleMatch.tsx");
    expect(match).toMatch(/import \{ dealtCrests, fetchCrestPool \} from "@\/utils\/roomCrests"/);
    expect(match).toMatch(/dealtCrests\(room\?\.id \?\? "", crestPool, \{\s*a: room\?\.team_a_icon \?\? null,\s*b: room\?\.team_b_icon \?\? null,/);
    expect(match).toMatch(/src=\{crests\[team\] \?\? undefined\}/);
  });

  it("a board tile carries one price pill coloured by difficulty (Figma 1019:41173)", () => {
    // The tile shows a single pill whose colour IS the difficulty and whose
    // number is the prize — not a difficulty word beside a separate number.
    const match = read("src/components/team-battle/TeamBattleMatch.tsx");
    expect(match).toMatch(/const DIFFICULTY_PILL: Record<string, string> = \{/);
    expect(match).toMatch(/easy: "bg-\[#7EDC7B\] text-\[#1D5423\]"/);
    expect(match).toMatch(/\$\{DIFFICULTY_PILL\[tile\.difficulty\] \?\? "bg-primary\/10 text-primary"\}`}\s*\n\s*>\s*\n\s*\{tile\.price\}/);
    // The bigger icon (Figma 67px leaf) and no more twin difficulty-word +
    // price row on the board tile.
    expect(match).toMatch(/iconSlug=\{cat\?\.icon_slug\}\s*\n\s*size=\{64\}/);
    expect(match).not.toMatch(/text-white text-\[10px\] font-bold \$\{DIFFICULTY_COLORS\[tile\.difficulty\]\}/);
  });

  it("the done screen wears the crests, names the roster, and offers + friend", () => {
    // Owner's ask: the verdict shows each side's crest + name, lists who you
    // played with, and a non-friend gets an add button (existing friendships
    // flow — no new SQL).
    const match = read("src/components/team-battle/TeamBattleMatch.tsx");
    expect(match).toMatch(/function DonePlayerRow\(/);
    expect(match).toMatch(/sendFriendRequest\(person\.user_id\)/);
    expect(match).toMatch(/participants\.filter\(\(p\) => !p\.is_bot && p\.user_id !== user\?\.id\)/);
    expect(match).toMatch(/friendIds\.has\(p\.user_id\)/);
    expect(match).toMatch(/teamBattle\.playedWith/);
    // The done screen draws the crest for each side, not just the name.
    const done = match.slice(match.indexOf("function PhaseDone"));
    expect(done).toMatch(/src=\{crests\[team\] \?\? undefined\}/);
  });
});

describe("every lobby says which game it is", () => {
  const universal = read("src/components/lobby/UniversalLobby.tsx");

  it("the title carries an icon beside it", () => {
    // A lobby used to open on a name and nothing else, so all three kinds
    // of room looked identical above the card — the same haze, the same
    // Slackey heading — and which game you had walked into was something
    // you worked out from the rows underneath.
    expect(universal).toMatch(/icon\?: string \| null;/);
    expect(universal).toMatch(/<RoomTitle name=\{roomName\} icon=\{icon\} editable \/>/);
    expect(universal).toMatch(/<RoomTitle name=\{roomName\} icon=\{icon\} \/>/);
  });

  it("the King wears the crowned mascot and the arena its crate", () => {
    expect(king).toMatch(/icon=\{kingRoom\?\.room_icon \|\| iconKingMascot\}/);
    expect(battle).toMatch(/icon=\{iconBattleCrate\}/);
  });

  it("an ordinary room wears the same face it wears everywhere else", () => {
    // Not a second random icon drawn for this screen: the per-room deal the
    // public card and the search strip already use, seeded off the room id,
    // so a room looks like itself wherever it turns up.
    expect(room).toMatch(/const roomFace = currentRoom\.room_icon \?\? dealtRoomIcon\(currentRoom\.id, iconPool\)/);
    expect(room).toMatch(/icon=\{roomFace\}/);
    // And the sheet opens on it, so a rename cannot silently clear the icon.
    expect(room).toMatch(/currentIconUrl=\{roomFace\}/);
  });

  it("the pencil marks the face a host may change, and only that one", () => {
    // The arena's sign is fixed — what the SIDES wear is the choosable part
    // — so it passes no onRename and gets no pencil.
    expect(battle).not.toMatch(/onRename=/);
    expect(room).toMatch(/onRename=\{isHost \? \(\) => setShowIconPicker\(true\) : undefined\}/);
  });
});

describe("a rule with one answer is not a rule", () => {
  it("Versus King draws no visibility row", () => {
    // Its lounge is friends-only by decision, so the row could only ever
    // read "private" with the other half greyed beside it — a control that
    // looks like a choice, is not one, and invites the tap that proves it.
    expect(king).toMatch(/rules=\{\[\]\}/);
    expect(king).not.toMatch(/key: "visibility"/);
  });

  it("the rooms that can publish keep theirs, and it acts", () => {
    for (const [name, src] of [["classic", room], ["battle", battle]] as const) {
      expect(src, name).toMatch(/key: "visibility"/);
      expect(src, name).toMatch(/onChange: isHost \?/);
    }
  });
});
