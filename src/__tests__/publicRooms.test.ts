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
import { filterPublicRooms, publicRoomPath, roomSeats, type PublicRoom } from "@/hooks/usePublicRooms";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const room = (over: Partial<PublicRoom> = {}): PublicRoom => ({
  id: "r1",
  room_code: "ABC123",
  room_name: "A room",
  room_icon: null,
  game_type_key: null,
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
      /createRoom = useCallback\(async \(isPublic = false, team: TBTeam = "a"\)/,
    );
    // The lounges make their own room after a navigation, so the switch
    // travels in router state and falls back to private without it.
    expect(read("src/pages/KingPage.tsx")).toMatch(/\)\?\.isPublic \?\? false,/);
    expect(read("src/pages/TeamBattlePage.tsx")).toMatch(/handoff\?\.isPublic \?\? false;/);
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

  it("the create screen offers the switch, published first", () => {
    const create = read("src/components/team/CreateRoomPage.tsx");
    expect(create).toContain("const [isPublic, setIsPublic] = useState(true)");
    // Every insert on this screen carries it — one that does not would make
    // a private room while the switch on screen said public.
    const inserts = (create.match(/roomVisibilityFields\(isPublic\)/g) ?? []).length;
    expect(inserts).toBe(2);
    expect(create).toMatch(/plannedRoomCode, isPublic\)/);
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
  it("filters by game and searches name, category and host", () => {
    const rooms = [
      room({ id: "a", game_type_key: "king", room_name: "Kings couch" }),
      room({ id: "b", game_type_key: "team_battle", room_name: "Arena" }),
      room({ id: "c", game_type_key: null, room_name: "Plain" }),
    ];
    expect(filterPublicRooms(rooms, "king", "").map((r) => r.id)).toEqual(["a"]);
    expect(filterPublicRooms(rooms, "classic", "").map((r) => r.id)).toEqual(["c"]);
    expect(filterPublicRooms(rooms, "all", "").length).toBe(3);
    expect(filterPublicRooms(rooms, "all", "arena").map((r) => r.id)).toEqual(["b"]);
    // The category is the thing people are shopping for on this tab.
    expect(filterPublicRooms(rooms, "all", "history").length).toBe(3);
  });

  it("counts the lounges' seats even when the row does not", () => {
    // Both lounges seat ten humans; the King's row says eleven because the
    // King takes one of them, and a card reading 2/11 counts a bot.
    expect(roomSeats(room({ game_type_key: "king", max_players: 11 }))).toBe(10);
    expect(roomSeats(room({ game_type_key: "team_battle", max_players: 10 }))).toBe(10);
    expect(roomSeats(room({ game_type_key: null, max_players: null }))).toBeNull();
  });

  it("sends each game to its own screen", () => {
    expect(publicRoomPath(room({ game_type_key: "king" }))).toBe("/king?code=ABC123");
    expect(publicRoomPath(room({ game_type_key: "team_battle" }))).toBe("/team-battle?code=ABC123");
    expect(publicRoomPath(room())).toBe("/team?join=ABC123");
  });

  it("asks the host rather than walking in", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/supabase\.rpc\("request_room_join"/);
    // Never a direct seat write: the policy would refuse it anyway, and a
    // refusal the UI does not expect reads as a broken button.
    expect(section).not.toMatch(/from\("room_participants"\)/);
    // Only the answer 'joined' walks in — everything else waits.
    expect(section).toMatch(/if \(outcome === "joined"\)/);
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
    // Host or that side's own captain — nobody else gets the pencil.
    expect(battle).toMatch(/const canDress = isHost \|\| \(!!user && mine\?\.user_id === user\.id\)/);
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
