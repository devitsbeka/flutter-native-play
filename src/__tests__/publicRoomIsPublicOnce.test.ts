/**
 * A public room is public once.
 *
 * A room is listed on the Public tab so strangers can find a game. Once
 * that game has been played it is the players' own: they may keep playing
 * in it — rematches, new games — but it is a private room from then on,
 * and nothing can make it public again. Owner: "two players played in
 * public room ... when game ended we see this room on private tab and can
 * play there again only in private, we shouldn't be able make this room
 * public again. public room is public only once than it becomes private
 * room with no ability to make the room public again. players in it can
 * play more but room stays private."
 *
 * Where it happens:
 *  - complete_room_round, the one write-set every round's end goes
 *    through, flips is_public off after it claims the round — on whichever
 *    participant's device claims it. A backlog sweep does the same for
 *    every public room that has already played.
 *  - The host's own completion write does it a round earlier, client-side,
 *    so the flip does not wait for the migration to be pasted.
 *  - The results screen's back arrow is the lobby for everyone: by then
 *    the room is a private room, and a private room's back was always
 *    the lobby.
 *  - The lobby's rules already follow the flag (#683): a public room shows
 *    the question count and Open/Ask, a private one the question count and
 *    Play on TV, and there is no Visibility switch to turn it back.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const migration = read("supabase/migrations/20261103110000_public_room_is_public_once.sql");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("the database", () => {
  it("flips a public room private in the round's own write-set, right after the claim", () => {
    const fn = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.complete_room_round"), migration.indexOf("-- ── the backlog"));
    const claim = fn.indexOf("RETURNING id INTO v_claimed;");
    const flip = fn.indexOf("UPDATE public.game_rooms\n  SET is_public = false\n  WHERE id = p_room_id\n    AND is_public IS TRUE;");
    const totals = fn.indexOf("SET total_score = COALESCE(total_score, 0) + COALESCE(score, 0),");
    expect(claim).toBeGreaterThan(-1);
    expect(flip).toBeGreaterThan(claim);
    expect(totals).toBeGreaterThan(flip);
  });

  it("keeps the function's posture: revoked from PUBLIC and anon, granted to the signed-in", () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.complete_room_round\(uuid, uuid\) FROM PUBLIC, anon;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.complete_room_round\(uuid, uuid\) TO authenticated;/);
  });

  it("sweeps the backlog: every public room that has already claimed a round", () => {
    expect(migration).toMatch(/SET is_public = false\s*\n\s*WHERE r\.is_public IS TRUE\s*\n\s*AND EXISTS \(\s*\n\s*SELECT 1 FROM public\.room_games g\s*\n\s*WHERE g\.room_id = r\.id AND g\.totals_applied/);
  });

  it("is proved against a real Postgres, from the friend's seat", () => {
    const suite = read("supabase/tests/18-public-once.sql");
    expect(suite).toContain("the public room is private the moment its first round is claimed");
    expect(suite).toContain("a private room stays private");
    expect(suite).toContain("a played public room is off the Public tab for good");
    expect(suite).toContain("a played public room is kept, as a private one");
    expect(read(".github/workflows/pr-checks.yml")).toContain("supabase/tests/18-public-once.sql");
  });
});

describe("the client", () => {
  it("the host's completion write flips it too, a round earlier and ahead of the migration", () => {
    expect(ctx).toMatch(/status: "completed",\s*\n\s*completed_at: new Date\(\)\.toISOString\(\),\s*\n\s*last_activity_at: new Date\(\)\.toISOString\(\),\s*\n(\s*\/\/[^\n]*\n)*\s*\.\.\.\(await roomVisibilityFields\(false\)\),/);
  });

  it("the results screen's back arrow is the lobby, for host and guest alike", () => {
    expect(results).toMatch(/const handleBackToRoom = \(\) => \{\s*\n\s*continueInRoom\(\);\s*\n\s*\};/);
    expect(results).not.toMatch(/navigate\("\/team\?tab=public"/);
  });

  it("the lobby's rules follow the flag and offer no way back to public", () => {
    expect(lobby).toMatch(/\.\.\.\(isPublicRoom && hasApprovalColumn && !playsOwnTrivia\s*\n\s*\? \[\{\s*\n\s*key: "joining",/);
    expect(lobby).toMatch(/tv=\{isHost && !isPublicRoom \?/);
    expect(lobby).not.toMatch(/key: "visibility"/);
    expect(lobby).not.toMatch(/roomVisibilityFields\(true\)/);
  });
});
