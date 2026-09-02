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
      /createRoom = useCallback\(async \(isPublic = false, team: TBTeam = "a", teamSize = 5\)/,
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

  it("only offers the switch for what can actually be published", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    expect(create).toContain("const [isPublic, setIsPublic] = useState(true)");
    // Three of the six can go on the Public tab. The quick game has no room
    // to list, the King's couch is a private duel, and My Trivia is your own
    // quiz — those are created private, with no switch shown.
    expect(create).toMatch(
      /const canPublish =\s*\n?\s*gameChoice === "random" \|\| gameChoice === "library" \|\| gameChoice === "battle";/,
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

  it("the switch sits with the button that acts on it", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    // Above the CTA, not at the top under the room's name — three scrolls
    // from the decision it modifies.
    const togglePos = create.indexOf("extra.roomPublicHint");
    const ctaPos = create.indexOf("extra.createBtn");
    expect(togglePos).toBeGreaterThan(-1);
    expect(togglePos).toBeLessThan(ctaPos);
    expect(create.indexOf("extra.whatToPlay")).toBeLessThan(togglePos);
  });
});

describe("the arena is sized before it is opened", () => {
  it("the host picks 2-2 through 5-5, under the switch", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    expect(create).toMatch(/const \[battleTeamSize, setBattleTeamSize\] = useState\(5\)/);
    expect(create).toMatch(/\[2, 3, 4, 5\]\.map\(\(size\) =>/);
    // The toggle sits ABOVE the sizing row (owner's ask), both above the
    // button.
    expect(create.indexOf("extra.roomPublicHint")).toBeLessThan(
      create.indexOf("extra.playersPerTeam"),
    );
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

  it("a game needs two people before it can start", () => {
    const lobby = read("src/components/team/RoomLobbyV2.tsx");
    // A pending invitation is a participant row too; counting it would arm
    // the button for somebody who has not arrived.
    expect(lobby).toMatch(/\(p\.status as string\) !== "invited"/);
    expect(lobby).toMatch(/const enoughPlayers = seatedPlayers >= 2;/);
    expect(lobby).toMatch(/\(!needsCategorySelection && !enoughPlayers\)/);
    // Picking a category stays open to a lone host — it is what gives the
    // second player a reason to accept.
    expect(lobby).toMatch(/rlNeedsSecondPlayer/);
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
    expect(section).toMatch(/\{category \|\| t\("game\.difficulty\.mixed"\)\}/);
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

  it("orders mine first, then my friends' rooms, then the rest newest first", () => {
    const rooms = [
      room({ id: "old-stranger", host_user_id: "s1", created_at: "2026-01-01T00:00:00Z" }),
      room({ id: "new-stranger", host_user_id: "s2", created_at: "2026-06-01T00:00:00Z" }),
      room({ id: "friends", host_user_id: "f1", created_at: "2026-02-01T00:00:00Z" }),
      room({ id: "mine", host_user_id: "me", my_state: "host", created_at: "2026-01-15T00:00:00Z" }),
      room({ id: "im-in", host_user_id: "s3", my_state: "joined", created_at: "2026-03-01T00:00:00Z" }),
    ];
    expect(sortPublicRooms(rooms, new Set(["f1"])).map((r) => r.id)).toEqual([
      "im-in", // rooms I sit in count as mine, newest of the two
      "mine",
      "friends",
      "new-stranger",
      "old-stranger",
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

  it("the arena passes the host's side; the other lobbies pass nothing", () => {
    expect(read("src/pages/TeamBattlePage.tsx")).toMatch(
      /hostTeam=\{\(participants\.find\(\(p\) => p\.is_host\)\?\.team as TBTeam \| null\) \?\? undefined\}/,
    );
    for (const file of ["src/components/team/RoomLobbyV2.tsx", "src/pages/KingPage.tsx"]) {
      expect(read(file), file).not.toMatch(/hostTeam=/);
    }
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

  it("the crests sit above the names, clear of the seats and the captains", () => {
    const battle = read("src/pages/TeamBattlePage.tsx");
    expect(battle).toMatch(/top-\[352px\] w-\[120px\] flex flex-col items-center/);
    expect(battle).toMatch(/size-\[60px\] object-contain/);
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
  it("is mounted in every lobby that can host a published room", () => {
    for (const file of [
      "src/components/team/RoomLobbyV2.tsx",
      "src/pages/KingPage.tsx",
      "src/pages/TeamBattlePage.tsx",
    ]) {
      expect(read(file), file).toMatch(/<JoinRequestGate\s/);
    }
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
