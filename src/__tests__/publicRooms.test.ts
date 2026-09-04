/**
 * Publishing a room is a promise about who can see it and who can enter,
 * and both halves are easy to break from the client side.
 *
 * The database enforces the entering (supabase/tests/13-public-rooms.sql);
 * these are the client's half of the same contract:
 *
 *  - a room is private unless something says otherwise, on every path that
 *    makes one — the default is what protects the paths nobody remembered;
 *  - the Private tab does not list a published room, or its host sees the
 *    same room twice with two different buttons on it;
 *  - the Public tab's button asks rather than joins;
 *  - the host's doorstep is mounted in every lobby that can host one.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { filterPublicRooms, publicRoomPath, roomSeats, sortPublicRooms, type PublicRoom } from "@/hooks/usePublicRooms";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const room = (over: Partial<PublicRoom> = {}): PublicRoom => ({
  id: "r1",
  room_code: "ABC123",
  room_name: "A room",
  room_icon: null,
  game_type_key: null,
  game_mode: null,
  status: "waiting",
  created_at: null,
  last_activity_at: null,
  host_user_id: "u1",
  host_nickname: "Host",
  host_avatar_url: null,
  player_count: 2,
  max_players: null,
  first_category_name: "History",
  first_category_icon: null,
  my_state: "none",
  ...over,
});

describe("a room is private unless somebody published it", () => {
  it("the migration backfills private and keeps that as the column default", () => {
    const sql = read("supabase/migrations/20260922100000_public_rooms.sql");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false/);
    // A later `SET DEFAULT true` would publish every room made by a path
    // that has no opinion — matchmaking duels included.
    expect(sql).not.toMatch(/ALTER COLUMN is_public SET DEFAULT true/);
  });

  it("every room-creating helper defaults to private", () => {
    expect(read("src/contexts/MultiplayerContextV2.tsx")).toMatch(/isPublic = false,/);
    expect(read("src/contexts/TeamBattleContext.tsx")).toMatch(
      /createRoom = useCallback\(async \(\s*isPublic = false,\s*team: TBTeam = "a",\s*teamSize = 5,/,
    );
    // The Battle lounge makes its own room after a navigation, so the
    // switch travels in router state and falls back to private without it.
    expect(read("src/pages/TeamBattlePage.tsx")).toMatch(/handoff\?\.isPublic \?\? false;/);
    // Versus King goes further: friends-only by owner's decision, so its
    // lounge ignores the switch entirely and always creates private.
    expect(read("src/pages/KingPage.tsx")).toMatch(/publishRef = useRef<boolean>\(false\)/);
  });

  it("survives a database that has not had the migration yet", () => {
    // Migrations land by hand, after the merge: for a while the app knows
    // about is_public and the database does not, and PostgREST answers an
    // insert naming an unknown column by writing nothing at all. Room
    // creation is the one write this whole screen exists to make.
    const guard = read("src/utils/roomVisibility.ts");
    expect(guard).toMatch(/select\("is_public"\)/);
    for (const file of [
      "src/components/team/CreateRoomPage.tsx",
      "src/contexts/MultiplayerContextV2.tsx",
      "src/contexts/TeamBattleContext.tsx",
      "src/pages/KingPage.tsx",
    ]) {
      expect(read(file), file).toMatch(/\.\.\.\(await roomVisibilityFields\(/);
      // Naming the column directly on a game_rooms insert is what the
      // guard exists to prevent (user_quiz_posts has its own is_public,
      // which is a different column on a table that has always had it).
      expect(read(file), file).not.toMatch(/is_public: (isPublic|publishRef)/);
    }
    // And the listing degrades to "nobody has published one yet".
    expect(read("src/hooks/usePublicRooms.ts")).toMatch(/PGRST202/);
  });

  it("publishes what can be published, and asks nobody on the way in", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    // The create screen used to carry the switch too. It was the same
    // question the lobby asks, one screen earlier, before there was a room
    // to be public about — so it is asked once now, where the room exists
    // and the answer can still be changed.
    expect(create).toContain("const isPublic = true;");
    expect(create).not.toMatch(/setIsPublic/);
    expect(create).not.toMatch(/extra\.roomPublicHint/);
    // Three of the six can go on the Public tab. The quick game has no room
    // to list, the King's couch is a private duel, and My Trivia is your own
    // quiz — those are created private whatever else happens.
    expect(create).toMatch(
      /const canPublish =\s*\n?\s*\(gameChoice === "guess" \|\| gameChoice === "library" \|\| gameChoice === "battle"\) && !partyPicked;/,
    );
    expect(create).toMatch(/const publishRoom = canPublish && isPublic;/);
    // Every write goes through the guarded value, never the raw switch —
    // otherwise a King room made with the switch left on would publish.
    expect(create).not.toMatch(/roomVisibilityFields\(isPublic\)/);
    const inserts = (create.match(/roomVisibilityFields\(publishRoom\)/g) ?? []).length;
    expect(inserts).toBe(2);
    expect(create).toMatch(/plannedRoomCode, publishRoom\)/);
    // The name is dealt locally now and never shown here — the lobby is
    // where a host renames a room they are looking at.
    expect(create).not.toMatch(/generate-room-name/);
    expect(create).toMatch(/generateRoomIdentity\(readAppLanguage\(\)\)/);
    expect(create).toMatch(/isPublic: publishRoom/);
  });

  it("the switch lives in the lobby, on every room that can publish", () => {
    // Wherever a room can be listed, the host finds the same segmented row
    // on the rules tab. This is the only place the question is asked.
    for (const file of [
      "src/components/team/RoomLobbyV2.tsx",
      "src/pages/TeamBattlePage.tsx",
    ]) {
      const src = read(file);
      expect(src, file).toMatch(/roomVisibilityFields\(value === "public"\)/);
      expect(src, file).toMatch(/value: "public", label: t\("extra\.roomPublic"\)/);
    }
  });
});

describe("the arena is sized before it is opened", () => {
  it("the host picks 2-2 through 5-5 from a dropdown above the button", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    // 2-2 is the default — the smallest game that can start — and the last
    // pick is remembered per device (owner's ask).
    expect(create).toMatch(/localStorage\.getItem\("mt\.battleTeamSize"\)/);
    expect(create).toMatch(/return saved >= 2 && saved <= 5 \? saved : 2;/);
    expect(create).toMatch(/localStorage\.setItem\("mt\.battleTeamSize", String\(n\)\)/);
    // The size dropdown is the whole footer row now — the visibility switch
    // that used to share it moved to the lobby. Still one short row above
    // the button, so the team pickers never scroll out of reach.
    expect(create).toMatch(/<div className="mb-3 flex items-stretch justify-end">/);
    expect(create).toMatch(/onValueChange=\{\(v\) => setBattleTeamSize\(Number\(v\)\)\}/);
    expect(create).toMatch(/\[2, 3, 4, 5\]\.map\(\(size\) =>/);
    expect(create).toMatch(/teamSize: gameChoice === "battle" \? battleTeamSize : undefined/);
  });

  it("the size caps the room and the seats the lobby draws", () => {
    expect(read("src/contexts/TeamBattleContext.tsx")).toMatch(
      /max_players: 2 \* Math\.max\(2, Math\.min\(5, Math\.round\(teamSize\)\)\)/,
    );
    const battle = read("src/pages/TeamBattlePage.tsx");
    expect(battle).toMatch(/const perSide = Math\.max\(2, Math\.min\(5, Math\.floor\(\(room\?\.max_players \?\? 10\) \/ 2\)\)\)/);
    expect(battle).toMatch(/\.slice\(0, perSide\)/);
  });
});

describe("the private tab and the lobby it opens", () => {
  it("the + makes a private room and lands in its lobby", () => {
    const page = read("src/pages/TeamV2.tsx");
    // Not the create screen: that screen is for deciding what to publish,
    // and on the Private tab every one of those questions is answered.
    expect(page).toMatch(/const createPrivateRoomAndOpen = async \(\) => \{/);
    expect(page).toMatch(/onSelectGameRoom=\{\(\) => void createPrivateRoomAndOpen\(\)\}/);
    // Explicitly private, and named so the lobby has a title.
    expect(page).toMatch(/generateRoomIdentity\(readAppLanguage\(\)\)/);
    expect(page).toMatch(/undefined,\s*\n\s*false,\s*\n\s*\);/);
  });

  it("a game needs somebody who can answer before it can start", () => {
    const lobby = read("src/components/team/RoomLobbyV2.tsx");
    // A pending invitation is a participant row too; counting it would arm
    // the button for somebody who has not arrived.
    expect(lobby).toMatch(/\(p\.status as string\) !== "invited"/);
    // A lone host can play a random or a library category (owner's rule:
    // a mode that does not need a second player starts without one). The
    // host of their OWN trivia sits out as observer, so that room needs one
    // more seat before it can start — and the disabled button says why.
    expect(lobby).toMatch(/const answeringPlayers = seatedPlayers - \(willBeObserver \? 1 : 0\);/);
    expect(lobby).toMatch(/const enoughPlayers = answeringPlayers >= 1;/);
    expect(lobby).toMatch(/\(!needsCategorySelection && !enoughPlayers\)/);
    expect(lobby).toMatch(/rlNeedsSecondPlayer/);
    // And the Invite line opens the room's own invite sheet.
    expect(lobby).toMatch(/onInvite=\{\(\) => setShowInviteModal\(true\)\}/);
    expect(lobby).toMatch(/<InviteFriendsModal\s*\n\s*isOpen=\{showInviteModal\}/);
  });
});

describe("the two tabs do not show the same room twice", () => {
  it("the Private tab asks for private rooms only", () => {
    const page = read("src/pages/TeamV2.tsx");
    expect(page).toMatch(/visibility="private"/);
    const rooms = read("src/hooks/useMyRooms.ts");
    expect(rooms).toMatch(/if \(visibility === "private"\) \{\s*\n\s*result = result\.filter\(\(room\) => !room\.is_public\)/);
  });

  it("old links still land somewhere real", () => {
    // ?tab=rooms is in people's history and in notifications already sent.
    const page = read("src/pages/TeamV2.tsx");
    expect(page).toMatch(/rooms: "private"/);
    expect(page).toMatch(/"my-content": "private"/);
    expect(page).toMatch(/explore: "public"/);
  });
});

describe("the public list", () => {
  it("filters by who is in a room, not by game, and searches name, category and host", () => {
    const rooms = [
      room({ id: "a", game_type_key: "king", room_name: "Kings couch", host_user_id: "me" }),
      room({ id: "b", game_type_key: "team_battle", room_name: "Arena", host_user_id: "pal" }),
      room({ id: "c", game_type_key: null, room_name: "Plain", host_user_id: "me", my_state: "host" }),
      room({ id: "d", game_type_key: null, room_name: "Ghost town", host_user_id: "far" }),
    ];
    const ctx = {
      seatedByRoom: new Map([
        ["b", ["pal", "buddy"]],
        ["c", ["me"]],
        ["d", ["far", "gone"]],
      ]),
      onlineIds: new Set(["me", "buddy"]),
      friendIds: new Set(["pal"]),
    };
    // Versus King is friends-only: a king room never reaches the public
    // list, whatever filter is asked for — even one an older build
    // managed to publish.
    expect(filterPublicRooms(rooms, "all", "", ctx).map((r) => r.id)).toEqual(["b", "c", "d"]);
    // A started game is not a room to join: it leaves the Public tab for
    // its players' Private tab.
    const started = [...rooms, room({ id: "e", room_name: "Running", host_user_id: "far", status: "playing" })];
    expect(filterPublicRooms(started, "all", "", ctx).map((r) => r.id)).toEqual(["b", "c", "d"]);
    // Active: somebody seated (the host counts) is in the app right now.
    // The arena's host is away but a player on it is here; the ghost town's
    // whole couch has left.
    expect(filterPublicRooms(rooms, "active", "", ctx).map((r) => r.id)).toEqual(["b", "c"]);
    // Mine: the rooms I created, as on the Private tab.
    expect(filterPublicRooms(rooms, "my_rooms", "", ctx).map((r) => r.id)).toEqual(["c"]);
    // My friends': hosted by a friend.
    expect(filterPublicRooms(rooms, "friends_rooms", "", ctx).map((r) => r.id)).toEqual(["b"]);
    expect(filterPublicRooms(rooms, "all", "arena", ctx).map((r) => r.id)).toEqual(["b"]);
    // The category is the thing people are shopping for on this tab.
    expect(filterPublicRooms(rooms, "all", "history", ctx).length).toBe(3);
  });

  it("a card offers the way out to the people who are in, and calls an unpicked round mixed", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    // The host deletes, a seated guest leaves; both through a confirm.
    expect(section).toMatch(/\{inside && \([^]*?room\.my_state === "host" \? \([^]*?<Trash2[^]*?<LogOut/);
    expect(section).toMatch(/from\("game_rooms"\)\s*\.delete\(\)/);
    expect(section).toMatch(/from\("room_participants"\)\s*\.delete\(\)[^]*?\.eq\("user_id", user\.id\)/);
    expect(section).toMatch(/<AlertDialog open=\{removing !== null\}/);
    // A room with no round picked plays a mixed first round — not "not
    // chosen yet", which reads as a room that is not ready.
    expect(section).toMatch(/\{category \|\| t\("extra\.cpMixedCategory"\)\}/);
    // A picked round wears ITS category's icon: from the listing when the
    // round was queued, else looked up from the stored name in whatever
    // language the host wrote it; only a mixed round wears the box.
    expect(section).toMatch(/room\.first_category_icon \|\| iconForCategory\(room\.first_category_name\) \|\| "mystery-box"/);
    expect(section).toMatch(/const MIXED_LABELS = new Set\(\[[^]*?"Mixed", "სხვადასხვა"/);
    expect(section).toMatch(/slug=\{categoryIcon\}/);
    const names = read("src/utils/categoryDisplayName.ts");
    expect(names).toMatch(/export function useCategoryIconByName\(/);
    expect(names).toMatch(/select\("id, name, icon_slug"\)/);
    expect(section).not.toContain("roomNoCategoryYet");
    // Refiltering the tab starts the list at the top, not half under the
    // sticky stack.
    const page = read("src/pages/TeamV2.tsx");
    expect(page).toMatch(/\}, \[publicFilter, publicSearchQuery, privateFilter, privateSearchQuery\]\);/);
  });

  it("a Trivia Battle card is its arena, darkened under white ink", () => {
    // Owner's direction: the pale arena scene gets a dark backdrop — the
    // image at reduced opacity over deep purple, a dark wash, an inner
    // shadow — so the card writes in the same white as every other card.
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/import sceneArena from "@\/assets\/tb-lobby\/scene-arena\.webp"/);
    expect(section).toMatch(/const scene = room\.game_type_key === "team_battle" \? sceneArena : null;/);
    expect(section).toMatch(/const ink = INK\.light;/);
    expect(section).toMatch(/object-cover opacity-\d+/);
    expect(section).toMatch(/bg-gradient-to-t from-\[#2E1065\]/);
    expect(section).toMatch(/shadow-\[inset_/);
    // The scene is framed on the crowned mascot, not the empty podium row.
    expect(section).toMatch(/objectPosition: "50% 30%"/);
    // Crest — centered title — crest, and a captainless side is dealt a
    // per-room crest from the library rather than the same stock pair.
    expect(section).toMatch(
      /crests\?\.a \?[^]*?text-center font-display[^]*?crests\?\.b \?/,
    );
    // The stock hat-and-car pair is gone everywhere (owner's rule: a side
    // wears what its captain set or a per-room random deal, never stock) —
    // the shared, ordered pool lives in utils/roomCrests so the card and
    // the lobby deal the same pair.
    expect(section).toMatch(/fetchCrestPool\(\)/);
    expect(section).toMatch(/dealtCrests\(r\.id, pool/);
    for (const file of [
      "src/components/team/PublicRoomsSection.tsx",
      "src/pages/TeamBattlePage.tsx",
      "src/components/team/CreateRoomPage.tsx",
    ]) {
      expect(read(file), file).not.toMatch(/team-penguins\.png|team-formula\.png/);
    }
    const crestUtil = read("src/utils/roomCrests.ts");
    expect(crestUtil).toMatch(/\.order\("icon_url"\)/);
    const lobby = read("src/pages/TeamBattlePage.tsx");
    expect(lobby).toMatch(/dealtCrests\(room\?\.id \?\? "", crestPool/);
    // The side's captain persists their own side's deal, so every surface
    // reads the same pair from the room row itself.
    expect(lobby).toMatch(/dressedRef\.current\.add\(key\);\s*\n\s*void supabase\.rpc\("tb_set_team_icon"/);
  });

  it("a card shows every seat, marks the live ones, and a wait can be taken back", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    // The full couch: a placeholder for every open seat, a face (with an
    // online dot) on every claimed one — so "one player short" is visible
    // at a glance.
    // The seats a card DRAWS are the effective ones — never fewer than the
    // heads counted — so a room over its own cap doesn't hide a player.
    expect(section).toMatch(/const effectiveSeats = seats != null \? Math\.max\(seats, room\.player_count\) : null;/);
    // A Battle room draws its full (small, fixed) seat count; every other
    // room draws only the seats that are taken — no ten empty chairs for a
    // classic cap-10 room (owner's ask).
    expect(section).toMatch(/isBattle\s*\n?\s*\? Math\.min\(effectiveSeats, 10\)\s*\n?\s*: Math\.min\(room\.player_count, 10\)/);
    expect(section).toMatch(/Array\.from\(\{ length: seatsToDraw \}/);
    expect(section).toMatch(/\$\{room\.player_count\}\/\$\{effectiveSeats\}/);
    // The Ready button is the mint "play" button (Figma 1058:325): a #81f0c3
    // face with a #2bc889 bottom lip and dark-purple type, saying "play".
    expect(section).toMatch(/rounded-\[24px\] bg-\[#81f0c3\] border-b-4 border-\[#2bc889\] text-\[#320c69\]/);
    expect(section).toMatch(/ready\s*\n?\s*\? t\("extra\.roomPlay"\)/);
    expect(section).not.toMatch(/from-\[#34d399\]/);
    expect(section).toMatch(/border-dashed border-white\/40/);
    expect(section).toMatch(/online\.has\(person\.user_id\)/);
    // The join button's green dot means somebody in the room is in the app
    // right now — a sleeping room's button carries none.
    expect(section).toMatch(/const live = online\.has\(room\.host_user_id\) \|\| players\.some/);
    // The dot means LIVE, and it stands down on a Ready card, which is
    // green all over and says so in words.
    expect(section).toMatch(/\{live && !ready && \(/);
    // One door at a time: a pending ask is withdrawable from the card, and
    // until it is, no other room's join can be pressed (see "one door at a
    // time" below — the old silent take-back moved the ask on a mis-tap).
    expect(section).toMatch(/onWithdraw\(room\)/);
    const sql = read("supabase/migrations/20260926100000_withdraw_join_request.sql");
    expect(sql).toMatch(/FOR DELETE/);
    expect(sql).toMatch(/user_id = auth\.uid\(\) AND status = 'pending'/);
  });

  it("offers active, mine, friends' and all — in that order, and no game chips", () => {
    const bar = read("src/components/team/UnifiedFiltersBar.tsx");
    expect(bar).toMatch(
      /publicRoomFilterOptions[^]*?\{ value: "active"[^]*?\{ value: "my_rooms"[^]*?\{ value: "friends_rooms"[^]*?\{ value: "all"/,
    );
    expect(bar).toMatch(/PublicRoomsFilter = "all" \| "active" \| "my_rooms" \| "friends_rooms"/);
    const section = read("src/components/team/PublicRoomsSection.tsx");
    // Presence goes through the function, never the owner-only table.
    expect(section).toMatch(/onlineUserIds\(everyone\)/);
    expect(section).not.toMatch(/from\("user_presence"\)/);
  });

  it("orders the room I'm waiting on first, then mine, then friends', then the rest", () => {
    const rooms = [
      room({ id: "old-stranger", host_user_id: "s1", created_at: "2026-01-01T00:00:00Z" }),
      room({ id: "new-stranger", host_user_id: "s2", created_at: "2026-06-01T00:00:00Z" }),
      room({ id: "friends", host_user_id: "f1", created_at: "2026-02-01T00:00:00Z" }),
      room({ id: "mine", host_user_id: "me", my_state: "host", created_at: "2026-01-15T00:00:00Z" }),
      room({ id: "im-in", host_user_id: "s3", my_state: "joined", created_at: "2026-03-01T00:00:00Z" }),
      // One game at a time: the ask I'm waiting on IS what I'm doing.
      room({ id: "waiting-on", host_user_id: "s4", my_state: "pending", created_at: "2026-01-02T00:00:00Z" }),
    ];
    expect(sortPublicRooms(rooms, new Set(["f1"])).map((r) => r.id)).toEqual([
      "waiting-on",
      "im-in", // rooms I sit in count as mine, newest of the two
      "mine",
      "friends",
      "new-stranger",
      "old-stranger",
    ]);
  });

  it("the room I asked to join is first, then a full room I'm in", () => {
    const rooms = [
      room({ id: "friends-full", host_user_id: "f1", game_type_key: "team_battle", max_players: 4, player_count: 4, created_at: "2026-06-05T00:00:00Z" }),
      room({ id: "waiting-on", host_user_id: "s4", my_state: "pending", created_at: "2026-06-04T00:00:00Z" }),
      room({ id: "mine-empty", host_user_id: "me", my_state: "host", game_type_key: "team_battle", max_players: 4, player_count: 1, created_at: "2026-06-03T00:00:00Z" }),
      room({ id: "im-in-full", host_user_id: "s2", my_state: "joined", game_type_key: "team_battle", max_players: 4, player_count: 4, created_at: "2026-06-01T00:00:00Z" }),
    ];
    expect(sortPublicRooms(rooms, new Set(["f1"])).map((r) => r.id)).toEqual([
      "waiting-on",
      "im-in-full",
      "mine-empty",
      "friends-full",
    ]);
  });

  it("an approval opens the room, once, and the card wears the private tab's proportions", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/event: "UPDATE",\s*schema: "public",\s*table: "room_join_requests",\s*filter: `user_id=eq\.\$\{user\.id\}`/);
    expect(section).toMatch(/row\.status !== "approved"[^]*?walkedInRef\.add\(row\.id\)/);
    expect(section).toMatch(/navigate\(publicRoomPath\(target\)\)/);
    // Mobile is ~10% taller than the first pass (owner's ask — the strip
    // read too small on a phone); desktop keeps its ratio.
    expect(section).toMatch(/min-h-\[202px\] aspect-\[1\.55\/1\] md:aspect-\[1\.35\/1\]/);
  });

  it("filters by game too: battles are the arenas, rooms are everything else", () => {
    const rooms = [
      room({ id: "arena", game_type_key: "team_battle", host_user_id: "h1" }),
      room({ id: "classic", game_type_key: null, host_user_id: "h2" }),
      room({ id: "words", game_type_key: "words", game_mode: "words", host_user_id: "h3" }),
    ];
    expect(filterPublicRooms(rooms, "battles", "").map((r) => r.id)).toEqual(["arena"]);
    expect(filterPublicRooms(rooms, "rooms", "").map((r) => r.id)).toEqual(["classic", "words"]);
    // And the dropdown offers both, between the people-filters and "all".
    const bar = read("src/components/team/UnifiedFiltersBar.tsx");
    expect(bar).toMatch(/\{ value: "battles", labelKey: "teamBattle\.title" \}/);
    expect(bar).toMatch(/\{ value: "rooms", labelKey: "extra\.filterRooms" \}/);
  });

  it("a room with nobody online sinks to the very back", () => {
    // Owner's rule: we need ONLINE players in rooms to play — a couch whose
    // whole party closed the app never shows first, whatever its fill.
    const rooms = [
      room({ id: "dead-full", host_user_id: "ghost", game_type_key: "team_battle", max_players: 4, player_count: 3, created_at: "2026-06-09T00:00:00Z" }),
      room({ id: "alive", host_user_id: "here", created_at: "2026-01-01T00:00:00Z" }),
    ];
    const ctx = {
      seatedByRoom: new Map([
        ["dead-full", ["ghost", "g2", "g3"]],
        ["alive", ["here"]],
      ]),
      onlineIds: new Set(["here"]),
      friendIds: new Set<string>(),
    };
    expect(sortPublicRooms(rooms, new Set(), ctx).map((r) => r.id)).toEqual([
      "alive",
      "dead-full",
    ]);
  });

  it("a stale playing battle is reported so the server can end it", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/sweptStaleRef\.current\.add\(r\.id\);/);
    expect(section).toMatch(/supabase\.rpc\("tb_finish_stale", \{ p_room_id: r\.id \}\)/);
    // The server re-checks the silence itself and takes the fee rules with
    // it: leaving a RUNNING match costs 200 coins, capped at the balance.
    const sql = read("supabase/migrations/20260928100000_tb_leave_and_stale.sql");
    expect(sql).toMatch(/GREATEST\(COALESCE\(v_coins, 0\) - 200, 0\)/);
    expect(sql).toMatch(/interval '5 minutes'/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.tb_leave_match\(uuid\) FROM PUBLIC, anon;/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.tb_finish_stale\(uuid\) FROM PUBLIC, anon;/);
    // And the match screen's back arrow charges only through the confirm.
    const match = read("src/components/team-battle/TeamBattleMatch.tsx");
    expect(match).toMatch(/inLiveMatch \? setConfirmLeave\(true\) : navigate\("\/"\)/);
    expect(match).toMatch(/teamBattle\.leaveMatchConfirm/);
  });

  it("within a group, the couch closest to starting comes first", () => {
    const rooms = [
      room({ id: "empty", host_user_id: "s1", game_type_key: "team_battle", max_players: 10, player_count: 2, created_at: "2026-06-01T00:00:00Z" }),
      room({ id: "one-short", host_user_id: "s2", game_type_key: "team_battle", max_players: 10, player_count: 9, created_at: "2026-01-01T00:00:00Z" }),
      // Nothing to join: a full couch goes to the back, not the front.
      room({ id: "full", host_user_id: "s3", game_type_key: "team_battle", max_players: 10, player_count: 10, created_at: "2026-06-02T00:00:00Z" }),
      room({ id: "no-cap", host_user_id: "s4", created_at: "2026-06-03T00:00:00Z" }),
    ];
    expect(sortPublicRooms(rooms, new Set()).map((r) => r.id)).toEqual([
      "one-short",
      "empty",
      "no-cap",
      "full",
    ]);
  });

  it("counts the lounges' seats even when the row does not", () => {
    // Both lounges seat ten humans; the King's row says eleven because the
    // King takes one of them, and a card reading 2/11 counts a bot.
    expect(roomSeats(room({ game_type_key: "king", max_players: 11 }))).toBe(10);
    expect(roomSeats(room({ game_type_key: "team_battle", max_players: 10 }))).toBe(10);
    // Battle rooms come in sizes now — the card counts the room's own seats.
    expect(roomSeats(room({ game_type_key: "team_battle", max_players: 4 }))).toBe(4);
    expect(roomSeats(room({ game_type_key: null, max_players: null }))).toBeNull();
  });

  it("sends each game to its own screen", () => {
    expect(publicRoomPath(room({ game_type_key: "king" }))).toBe("/king?code=ABC123");
    expect(publicRoomPath(room({ game_type_key: "team_battle" }))).toBe("/team-battle?code=ABC123");
    expect(publicRoomPath(room())).toBe("/team?join=ABC123");
    // Words rooms are told apart by game_mode when the catalog key is not
    // applied yet, so the listing has to carry it — see roomRoutes.
    expect(publicRoomPath(room({ game_mode: "words" }))).toBe("/words/ABC123");
  });

  it("asks the host rather than walking in", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/supabase\.rpc\("request_room_join"/);
    // Never a direct seat write: the policy would refuse it anyway, and a
    // refusal the UI does not expect reads as a broken button. (Reading the
    // seated faces for the card is fine — the write is the promise. So is
    // deleting your OWN row: that is leaving, and "Users can leave rooms"
    // allows exactly that.)
    expect(section).not.toMatch(/from\("room_participants"\)\s*\n?\s*\.(insert|update|upsert)/);
    // Only the answer 'joined' walks in — everything else waits.
    expect(section).toMatch(/if \(outcome === "joined"\)/);
  });
});

describe("the create screen's carousel", () => {
  it("starts a mode on its tap, with no picked state between the card and the game", () => {
    const page = read("src/components/team/CreateRoomPage.tsx");
    // A tap arms the start; the effect presses Create once the mode is ready.
    expect(page).toMatch(/onClick=\{\(\) => startMode\(card\.key\)\}/);
    expect(page).toMatch(/autoStart\.current = true/);
    // The row never collapses to a banner: the posters keep their height.
    expect(page).not.toMatch(/h-\[224px\]/);
    expect(page).toMatch(/min-h-\[300px\] flex-1 snap-x/);
  });
});

describe("a knock answered from the activity list", () => {
  it("the join-request notification offers accept and decline and answers through the RPC", () => {
    const card = read("src/components/notifications/CompactNotificationCard.tsx");
    expect(card).toMatch(/const isJoinRequest = notification\.type === 'room_join_request';/);
    expect(card).toMatch(/hasDualActions = \(isFriendRequest \|\| isGameInvite \|\| isJoinRequest\)/);
    expect(card).toMatch(/onAcceptJoin\?\.\(roomId, requesterId, notification\.id\)/);
    expect(card).toMatch(/onDeclineJoin\?\.\(roomId, requesterId, notification\.id\)/);
    const hook = read("src/hooks/useRoomJoinRequests.ts");
    expect(hook).toMatch(/export async function answerJoinRequest\(/);
    expect(hook).toMatch(/\.eq\("status", "pending"\)[^]*?supabase\.rpc\("respond_room_join"/);
    for (const host of ["src/components/home/NotificationsPanel.tsx", "src/pages/Notifications.tsx"]) {
      const src = read(host);
      expect(src).toMatch(/onAcceptJoin=\{\(r, u, n\) => void handleJoinAnswer\(r, u, n, true\)\}/);
      expect(src).toMatch(/onDeclineJoin=\{\(r, u, n\) => void handleJoinAnswer\(r, u, n, false\)\}/);
    }
  });
});

describe("a knock shows on the host's card, and back leads to the online-game page", () => {
  it("the host's card carries a knock count read from pending requests", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/from\("room_join_requests"\)[^]*?\.eq\("status", "pending"\)/);
    expect(section).toMatch(/room\.my_state === "host" && knocks > 0 && \(/);
    expect(section).toMatch(/knocks=\{knocksByRoom\?\.get\(room\.id\) \?\? 0\}/);
  });

  it("the arena's back button returns to /team, not home", () => {
    const battle = read("src/pages/TeamBattlePage.tsx");
    expect(battle).toMatch(/onBack=\{\(\) => \{[^]*?navigate\("\/team"\);[^]*?void leaveRoom\(\);/);
    expect(battle).not.toMatch(/onBack=\{\(\) => \{[^]*?navigate\("\/"\);/);
  });
});

describe("one door at a time", () => {
  it("an ask waiting elsewhere blocks every other join until it is withdrawn", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/const waitingRoomId = \(data \?\? \[\]\)\.find\(\(r\) => r\.my_state === "pending"\)\?\.id \?\? null;/);
    expect(section).toMatch(/blocked=\{!!waitingRoomId && waitingRoomId !== room\.id\}/);
    expect(section).toMatch(/disabled=\{busy \|\| waiting \|\| blocked\}/);
    // And the ask itself refuses, so the card body's tap explains why
    // instead of silently moving the ask to another room.
    expect(section).toMatch(/toast\.error\(t\("extra\.joinOneAtATime"\)\);\s*return;/);
    expect(section).not.toMatch(/\.eq\("status", "pending"\)\s*\.neq\("room_id", room\.id\)/);
    for (const lang of ["ka", "en", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`)).toMatch(/joinOneAtATime: "/);
    }
  });

  it("the ask I am waiting on is the first card, even if its couch went quiet", () => {
    const rooms = [
      room({ id: "alive-stranger", host_user_id: "here", created_at: "2026-06-01T00:00:00Z" }),
      room({ id: "waiting-on", host_user_id: "ghost", my_state: "pending", created_at: "2026-01-01T00:00:00Z" }),
    ];
    const ctx = {
      seatedByRoom: new Map([["waiting-on", ["ghost"]], ["alive-stranger", ["here"]]]),
      onlineIds: new Set(["here"]),
      friendIds: new Set<string>(),
    };
    expect(sortPublicRooms(rooms, new Set(), ctx).map((r) => r.id)).toEqual([
      "waiting-on",
      "alive-stranger",
    ]);
  });
});

describe("the doorstep follows the host around the app", () => {
  it("is mounted once app-wide, and the lobbies no longer own it", () => {
    expect(read("src/App.tsx")).toMatch(/<GlobalJoinRequestGate \/>/);
    for (const f of [
      "src/components/team/RoomLobbyV2.tsx",
      "src/pages/TeamBattlePage.tsx",
      "src/pages/KingPage.tsx",
    ]) {
      expect(read(f)).not.toMatch(/<JoinRequestGate/);
    }
  });

  it("watches every room the host owns and walks them in on a yes", () => {
    const hook = read("src/hooks/useRoomJoinRequests.ts");
    expect(hook).toMatch(/export function useHostJoinRequests\(/);
    // No room filter on the read: the table's policy is what scopes it.
    expect(hook).toMatch(/\.eq\("status", "pending"\)\s*\.order\("created_at"/);
    expect(hook).toMatch(/host_user_id === user\.id/);
    const gate = read("src/components/team/JoinRequestGate.tsx");
    expect(gate).toMatch(/export function GlobalJoinRequestGate\(/);
    expect(gate).toMatch(/if \(!approve \|\| outcome === "gone" \|\| !next\.room_code\) return;/);
    expect(gate).toMatch(/navigate\(routeForRoom\(/);
    // Already looking at that room? Then a yes changes nothing but the seat.
    expect(gate).toMatch(/here\.toUpperCase\(\)\.includes\(next\.room_code\.toUpperCase\(\)\)/);
  });

  it("a room I host says Enter; somebody else's says it is a request", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(
      /ready\s*\? t\("extra\.roomPlay"\)\s*: inside\s*\? t\("extra\.roomEnter"\)\s*: t\("extra\.roomJoinLive"\)/,
    );
    for (const lang of ["ka", "en", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`)).toMatch(/roomEnter: "/);
    }
  });
});

describe("the doorstep names a side", () => {
  it("asks 'with me or against me' in the arena only", () => {
    const gate = read("src/components/team/JoinRequestGate.tsx");
    // No header line any more — the one label under the face says it.
    expect(gate).not.toMatch(/joinRequestTitle/);
    // The picker exists only when a side is given; the classic lobby and
    // the King's couch have none to give.
    expect(gate).toMatch(/\{hostTeam && \(/);
    expect(gate).toMatch(/joinRequestMyTeam/);
    expect(gate).toMatch(/joinRequestOpponent/);
    // Opponent by default, reset for each new asker.
    expect(gate).toMatch(/useState<"a" \| "b" \| undefined>\(otherTeam\)/);
    // The answer rides on the approval, never as a separate write.
    expect(gate).toMatch(/respond\(next\.id, true, team\)/);
    expect(read("src/hooks/useRoomJoinRequests.ts")).toMatch(/\.\.\.\(approve && team \? \{ p_team: team \} : \{\}\)/);
  });

  it("the side is read from the host's own seat, and only for an arena", () => {
    // The doorstep is app-wide now, so it finds the host's side itself
    // rather than each lobby handing it down: the arena's request carries
    // a team, the couch's and the classic room's carry null.
    const hook = read("src/hooks/useRoomJoinRequests.ts");
    expect(hook).toMatch(/room\.game_type_key === "team_battle" && \(team === "a" \|\| team === "b"\) \? team : null/);
    expect(read("src/components/team/JoinRequestGate.tsx")).toMatch(
      /hostTeam=\{next\?\.host_team \?\? undefined\}/,
    );
  });

  it("the RPC drops both signatures before recreating, so it re-runs clean", () => {
    const sql = read("supabase/migrations/20260924100000_join_approval_picks_team.sql");
    expect(sql).toMatch(/DROP FUNCTION IF EXISTS public\.respond_room_join\(uuid, boolean\);/);
    expect(sql).toMatch(/DROP FUNCTION IF EXISTS public\.respond_room_join\(uuid, boolean, text\);/);
    expect(sql).toMatch(/p_team text DEFAULT NULL/);
    // A side left unsaid keeps whatever the row had — an invited seat may
    // carry the team it was reserved for.
    expect(sql).toMatch(/team = COALESCE\(EXCLUDED\.team, room_participants\.team\)/);
  });
});

describe("a block, and what a removal costs", () => {
  it("the door shuts from the same modal that opens it", () => {
    const gate = read("src/components/team/JoinRequestGate.tsx");
    expect(gate).toMatch(/void block\(next\.id\)/);
    // Under the two real answers, not beside them: a row of three equal
    // buttons invites a mis-tap into the one that cannot be undone here.
    expect(gate.indexOf("joinRequestBlock")).toBeGreaterThan(gate.indexOf("joinRequestAccept"));
    expect(read("src/hooks/useRoomJoinRequests.ts")).toMatch(/supabase\.rpc\("block_room_join"/);
  });

  it("a blocked player loses sight of the room, and leaving spends an approval", () => {
    const sql = read("supabase/migrations/20260923100000_battle_teams_and_blocks.sql");
    // The listing is most of what makes a block stick.
    expect(sql).toMatch(/AND b\.status = 'blocked'/);
    expect(sql).toMatch(/IF v_existing = 'blocked' THEN\s*\n\s*RETURN 'blocked';/);
    // A trigger, not a line in one removal path: there are several ways a
    // seat empties and they all have to mean the same thing.
    expect(sql).toMatch(/AFTER DELETE ON public\.room_participants/);
    expect(sql).toMatch(/AND status <> 'blocked'/);
  });
});

describe("the arena's two sides", () => {
  it("has no room name of its own", () => {
    const battle = read("src/pages/TeamBattlePage.tsx");
    expect(battle).not.toMatch(/generate-room-name/);
    // And its card leads with the game rather than with a dealt name.
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/lounge \? t\(lounge\.labelKey\) : room\.room_name/);
  });

  it("lets a side's captain dress it, through the RPC", () => {
    const battle = read("src/pages/TeamBattlePage.tsx");
    expect(battle).toMatch(/supabase\.rpc\("tb_set_team_icon"/);
    // Only that side's own captain gets the pencil — the host has no say
    // over the other team's colours (owner's decision).
    expect(battle).toMatch(/const canDress = !!user && mine\?\.user_id === user\.id/);
    expect(battle).not.toMatch(/canDress = isHost \|\|/);
    // Never a direct write: game_rooms' update policy is host-only, so a
    // captain writing the column straight would fail silently under RLS.
    expect(battle).not.toMatch(/update\(\{ team_[ab]_icon/);
  });

  it("the two benches sit side by side, each under its own crest", () => {
    // Stacked, "how many are on my side and how many on theirs" was a
    // scroll and a subtraction. They are two columns now, and each heading
    // is a column too: crest, name, seat count, captain under it.
    const battle = read("src/pages/TeamBattlePage.tsx");
    expect(battle).toMatch(/const benchTitle = \(team: TBTeam\)/);
    expect(battle).toMatch(/playersLayout="columns"/);
    expect(battle).toMatch(/size-\[52px\] object-contain/);
    const universal = read("src/components/lobby/UniversalLobby.tsx");
    expect(universal).toMatch(/grid grid-cols-\[1fr_auto_1fr\] items-start/);
    // Half the width to work in, so the rows go compact rather than
    // truncating a name to three letters.
    expect(universal).toMatch(/compact\?: boolean;/);
  });

  it("an empty seat is drawn on both sides, and tappable on the ones you may fill", () => {
    const battle = read("src/pages/TeamBattlePage.tsx");
    // Only the filled seats used to be drawn, so the gaps were invisible.
    expect(battle).toMatch(/const canFill = team === myTeam \|\| isHost;/);
    expect(battle).toMatch(/empty: true,/);
    expect(battle).toMatch(/onPress: canFill \? \(\) => seatAction\(team\) : undefined,/);
    expect(read("src/components/lobby/UniversalLobby.tsx")).toMatch(/if \(player\.empty\) \{/);
  });

  it("the lobby says how many more people it is waiting for", () => {
    const battle = read("src/pages/TeamBattlePage.tsx");
    expect(battle).toMatch(
      /const stillNeeded =\s+Math\.max\(0, 2 - teamA\.length\) \+ Math\.max\(0, 2 - teamB\.length\);/,
    );
    expect(battle).toMatch(/t\("teamBattle\.needToStart", \{ n: stillNeeded \}\)/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/needToStart: ".*\{n\}.*"/);
      expect(src, lang).toMatch(/openSeat: "/);
    }
  });

  it("the host picks their side when they make the room", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    expect(create).toMatch(/const \[battleTeam, setBattleTeam\] = useState<"a" \| "b">\("a"\)/);
    expect(create).toMatch(/team: gameChoice === "battle" \? battleTeam : undefined/);
    // And the arena seats them there rather than always on A.
    expect(read("src/contexts/TeamBattleContext.tsx")).toMatch(/\n        team,\n/);
  });
});

describe("the host's doorstep", () => {
  it("is mounted once, app-wide, rather than per lobby", () => {
    // A host is rarely sitting in the lobby when somebody knocks — see
    // "the doorstep follows the host around the app".
    expect(read("src/App.tsx")).toMatch(/<GlobalJoinRequestGate \/>/);
  });

  it("answers through the RPC, never by writing the request row", () => {
    const hook = read("src/hooks/useRoomJoinRequests.ts");
    expect(hook).toMatch(/supabase\.rpc\("respond_room_join"/);
    expect(hook).not.toMatch(/from\("room_join_requests"\)\s*\n?\s*\.(insert|update|delete)/);
  });

  it("shows the asker's record and trophies but not their quizzes", () => {
    const gate = read("src/components/team/JoinRequestGate.tsx");
    expect(gate).toMatch(/openProfile\(next\.user_id, \{ hideTrivias: true \}\)/);
    const modal = read("src/components/profile/PlayerProfileModal.tsx");
    expect(modal).toMatch(/const showTriviasTab = !hideTrivias/);
    // Trophies must survive the hiding — they are half of what the host is
    // looking at.
    expect(modal).toMatch(/<TabsTrigger value="trophies"/);
  });
});

describe("the cards read on every gradient, and every card shows its way out", () => {
  it("labels sit on a dark scrim, not white-on-white", () => {
    // White/15 pills with white type on them disappeared over the light
    // gradients — the owner's screenshot of "21 საათის წინ" was a white
    // whisper on pale orange.
    const pub = read("src/components/team/PublicRoomsSection.tsx");
    expect(pub).toMatch(/pill: "bg-black\/25 border-white\/25"/);
    const mine = read("src/components/team/MyRoomsSection.tsx");
    expect(mine).toMatch(/bg-black\/25 backdrop-blur-sm text-white font-bold text-xs/);
    expect(mine).not.toMatch(/bg-white\/20 backdrop-blur-sm text-white font-bold/);
  });

  it("the private tab wears the public tab's trash and log-out, on every device", () => {
    // The way out used to hide in a desktop-only 3-dot menu; mobile had
    // only the swipe, which nobody discovers.
    const mine = read("src/components/team/MyRoomsSection.tsx");
    expect(mine).not.toMatch(/MoreHorizontal/);
    expect(mine).not.toMatch(/DropdownMenu/);
    expect(mine).toMatch(/<LogOut className="w-4 h-4 text-white" \/>/);
    const trashButtons = mine.match(/setShowDeleteConfirm\(true\);\s*\n\s*\}\}\s*\n\s*className="w-8 h-8 rounded-full bg-black\/25/g) ?? [];
    expect(trashButtons.length).toBe(2);
  });

  it("a classic party room wears My Trivia Party's icon, unless the host picked one", () => {
    const mine = read("src/components/team/MyRoomsSection.tsx");
    expect(mine).toMatch(/iconPartyLounge, label: t\("extra\.myTriviaPartyLabel"\)/);
    // What the host picked wins over the game's stock face — the King
    // couch's dressed icon shows on its card too.
    expect(mine).toMatch(/room\.room_icon \?\? lounge\?\.icon/);
    const pub = read("src/components/team/PublicRoomsSection.tsx");
    expect(pub).toMatch(/lounge\?\.icon \?\? room\.room_icon|room\.room_icon \?\? lounge\?\.icon/);
  });
});

describe("every room wears a face, and the card leads with its category", () => {
  it("a room without an icon is dealt one from the shared pool, everywhere", () => {
    // The search strip and the public card both fall back to a room-id
    // seeded pick off the same pool — never a blank gamepad.
    const crests = read("src/utils/roomCrests.ts");
    expect(crests).toMatch(/export function dealtRoomIcon\(roomId: string, pool: readonly string\[\]\)/);
    const mini = read("src/components/search/SearchMiniCards.tsx");
    expect(mini).toMatch(/room\.room_icon \|\| room\.cover_image \|\| dealtRoomIcon\(room\.id, pool\)/);
    const pub = read("src/components/team/PublicRoomsSection.tsx");
    expect(pub).toMatch(/room\.room_icon \?\? lounge\?\.icon \?\? dealtRoomIcon\(room\.id, iconPool\)/);
    // A dealt room face is never one a category wears: the pool strikes out
    // any library icon whose slug is a category's icon (owner's rule).
    expect(crests).toMatch(/from\("categories"\)\.select\("icon_slug, icon"\)/);
    expect(crests).toMatch(/!\(r\.slug && categoryIcons\.has\(String\(r\.slug\)\)\)/);
  });

  it("the public card says სათამაშო ოთახი and drops the FIRST ROUND caption", () => {
    const pub = read("src/components/team/PublicRoomsSection.tsx");
    expect(pub).toMatch(/t\("extra\.gameRoomLabel"\)/);
    expect(pub).not.toMatch(/extra\.firstRoundLabel/);
    expect(pub).not.toMatch(/extra\.publicRoomLabel/);
  });
});
