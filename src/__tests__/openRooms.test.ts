/**
 * A published room anyone may walk into.
 *
 * Every public room was a door you had to knock on: tap Join, an ask goes to
 * the host, and until they look at their phone you sit on a card that says
 * "Waiting" — for a room whose whole point is being listed where strangers
 * can find it. Approval is the host's choice now, and the default is off.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const sql = read("supabase/migrations/20260930100000_open_rooms.sql");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("the server decides who gets in", () => {
  it("open by default — the column loosens nothing that was not published", () => {
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;/,
    );
  });

  it("an open public room seats you, and says 'joined'", () => {
    // 'joined' is the answer the client already navigates on — it is what an
    // invited player, or one holding an unused approval, has always got back.
    expect(sql).toMatch(/IF NOT v_room\.requires_approval\s*\n\s*OR EXISTS \(SELECT 1 FROM game_invitations/);
    expect(sql).toMatch(/INSERT INTO room_participants[\s\S]{0,400}RETURN 'joined';/);
    expect(read("src/components/team/PublicRoomsSection.tsx")).toMatch(
      /if \(outcome === "joined"\) \{\s*\n\s*navigate\(publicRoomPath\(room\)\);/,
    );
  });

  it("a private room still refuses outright — its code is the permission", () => {
    expect(sql).toMatch(/IF NOT v_room\.is_public THEN\s*\n\s*RAISE EXCEPTION 'that room is not public';/);
  });

  it("and a full room is not joinable by either door", () => {
    // Without this an open room seats an eleventh player, where the ask used
    // to at least stop at a host who could see the room was full.
    expect(sql).toMatch(/>= COALESCE\(v_room\.max_players, 10\) THEN\s*\n\s*RAISE EXCEPTION 'that room is full';/);
  });

  it("stays revoked from PUBLIC and anon (CLAUDE.md rule 3)", () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.request_room_join\(uuid\) FROM PUBLIC, anon;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.request_room_join\(uuid\) TO authenticated;/);
  });
});

describe("the host's switch", () => {
  it("is one row in the lobby's rules, open or ask", () => {
    expect(lobby).toMatch(/key: "joining",/);
    expect(lobby).toMatch(/\{ value: "open", label: t\("extra\.roomJoinOpen"\) \}/);
    expect(lobby).toMatch(/\{ value: "ask", label: t\("extra\.roomJoinAsk"\) \}/);
    expect(lobby).toMatch(/value: needsApproval \? "ask" : "open",/);
    expect(lobby).toMatch(/\.update\(\{ requires_approval: value === "ask" \}\)/);
  });

  it("only on a public room — a private one's code is already the yes", () => {
    expect(lobby).toMatch(/\.\.\.\(isPublicRoom && hasApprovalColumn/);
  });

  it("and is hidden until the migration lands", () => {
    // Migrations land here by hand. A switch that silently writes nothing is
    // worse than no switch: the host sets it, watches it snap back, and
    // concludes the room is broken.
    const probe = read("src/utils/roomVisibility.ts");
    expect(probe).toMatch(/export function gameRoomsHasApproval\(\): Promise<boolean>/);
    expect(probe).toMatch(/\.select\("requires_approval"\)\.limit\(1\)/);
    expect(probe).toMatch(/approvalProbe = null;/);
    expect(lobby).toMatch(/if \(!isHost \|\| !hasApprovalColumn\) return;/);
  });

  it("with the column hand-added to types.ts, never regenerated", () => {
    // CLAUDE.md rule 1: regenerating against a database without the
    // entitlement migrations silently deletes six RPCs.
    const types = read("src/integrations/supabase/types.ts");
    expect(types).toMatch(/requires_approval: boolean/);
    expect(types).toMatch(/requires_approval\?: boolean/);
  });

  it("named in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).toMatch(/uJoining: "../);
      expect(locale, lang).toMatch(/roomJoinOpen: "../);
      expect(locale, lang).toMatch(/roomJoinAsk: "../);
    }
  });
});
