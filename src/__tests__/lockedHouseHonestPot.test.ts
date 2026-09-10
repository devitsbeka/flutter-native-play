/**
 * The online-room audit, phases A and B.
 *
 * Phase A locks the house: a signed-in user could flip any room's unread
 * flag, rewrite the economy config and the shop catalog, pay themselves a
 * "room_prize" through credit_gameplay_reward, be welcomed with coins for a
 * PRO seat somebody else bought, be approved into a full or running room,
 * and knock on the room of somebody who had blocked them. Phase B makes the
 * pot honest: a seat with no coins was "charged" nothing and could still
 * win the pot, ties were ranked by seat order, an observing host staked and
 * won, the daily ceiling burned a share of the pot, and a screen that only
 * meant to SHOW earlier rounds settled them.
 *
 * The arithmetic and the policies are proved against Postgres in
 * supabase/tests/22-lock-the-house.sql and 23-honest-pot.sql. This pins the
 * shape the client relies on and that CI runs both.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lock = read("supabase/migrations/20261106100000_lock_the_house.sql");
const pot = read("supabase/migrations/20261106110000_the_pot_is_honest.sql");
const ci = read(".github/workflows/pr-checks.yml");

describe("the house is locked", () => {
  it("the unread flag is cleared through a function, not a row update", () => {
    expect(lock).toMatch(/CREATE OR REPLACE FUNCTION public\.clear_room_unread\(p_room_id uuid\)/);
    expect(lock).toMatch(/DROP POLICY IF EXISTS "Participants can clear unread activity" ON public\.game_rooms;/);
    expect(lock).toMatch(/REVOKE ALL ON FUNCTION public\.clear_room_unread\(uuid\) FROM PUBLIC, anon;/);
    const rooms = read("src/components/team/MyRoomsSection.tsx");
    expect(rooms).toMatch(/supabase\.rpc\("clear_room_unread", \{ p_room_id: room\.id \}\)/);
    expect(rooms).not.toMatch(/\.update\(\{ has_unread_activity: false \}\)/);
  });

  it("the economy config and the shop catalog are admin-only", () => {
    for (const table of ["economy config", "shop products", "iap products"]) {
      expect(lock).toContain(`CREATE POLICY "Admins manage ${table}"`);
    }
    expect(lock).toMatch(/DROP POLICY IF EXISTS "Authenticated users can update economy config"/);
    expect(lock).toMatch(/DROP POLICY IF EXISTS "Authenticated users can manage shop products"/);
    expect(lock).toMatch(/DROP POLICY IF EXISTS "Authenticated users can manage iap products"/);
  });

  it("credit_gameplay_reward pays only the kinds a player earns alone", () => {
    expect(lock).toMatch(
      /IF p_kind NOT IN \(\s*'quiz_reward', 'level_up', 'stake_win', 'spin', 'chest',\s*'mission', 'ad_reward', 'achievement', 'feed_trivia'\s*\) THEN/,
    );
    for (const kind of ["room_prize", "king_win", "team_battle_win", "streak_milestone", "shop_grant"]) {
      // Nothing a client used to be able to name as a kind is on the list.
      expect(lock.slice(lock.indexOf("IF p_kind NOT IN"), lock.indexOf("is not a player reward"))).not.toContain(kind);
    }
    expect(lock).toMatch(/RAISE EXCEPTION 'Reward kind % is not a player reward', p_kind;/);
  });

  it("a PRO seat is not a purchase to be welcomed with coins", () => {
    expect(lock).toMatch(/IF COALESCE\(NEW\.purchase_platform, ''\) = 'seat' THEN\s*\n\s*RETURN NEW;/);
  });

  it("the host cannot approve into a full or running room", () => {
    expect(lock).toMatch(/RAISE EXCEPTION 'that round has started';/);
    expect(lock).toMatch(/RAISE EXCEPTION 'that room is full';/);
  });

  it("a blocked pair neither knocks nor sees each other's rooms", () => {
    expect(lock).toMatch(/IF public\.is_block_between\(v_uid, v_room\.host_user_id\) THEN\s*\n\s*RETURN 'blocked';/);
    expect(lock).toMatch(/AND NOT public\.is_block_between\(auth\.uid\(\), r\.host_user_id\)/);
  });

  it("public_rooms counts seats, not invitations, and says whether it asks first", () => {
    expect(lock).toMatch(/requires_approval\s+boolean/);
    const types = read("src/integrations/supabase/types.ts");
    expect(types).toMatch(/clear_room_unread: \{/);
    expect(types).toMatch(/room_round_ledger: \{/);
    expect(read("src/hooks/usePublicRooms.ts")).toMatch(/requires_approval\?: boolean/);
  });
});

describe("the pot is honest", () => {
  it("only seats that can pay the stake are at the table", () => {
    expect(pot).toMatch(/COALESCE\(p\.coins, 0\) >= v_stake/);
    expect(pot).toMatch(/'reason', 'practice'/);
  });

  it("the observing host neither stakes nor wins", () => {
    expect(pot).toMatch(/g\.host_is_observer IS TRUE THEN g\.host_user_id/);
  });

  it("tied scores split the tied places' shares", () => {
    expect(pot).toMatch(/rank\(\) OVER \(ORDER BY COALESCE\(rp\.score, 0\) DESC\)/);
    expect(pot).toMatch(/count\(\*\) OVER \(PARTITION BY COALESCE\(rp\.score, 0\)\)/);
  });

  it("the daily ceiling does not burn a share of the pot", () => {
    const settle = pot.slice(pot.indexOf("FUNCTION public.settle_room_round"), pot.indexOf("FUNCTION public.complete_room_round"));
    expect(settle).not.toMatch(/v_ceiling/);
  });

  it("there is a read of the ledger that settles nothing", () => {
    expect(pot).toMatch(/CREATE OR REPLACE FUNCTION public\.room_round_ledger\(p_game_id uuid\)/);
    expect(pot).toMatch(/REVOKE ALL ON FUNCTION public\.room_round_ledger\(uuid\) FROM PUBLIC, anon;/);
    expect(pot).toMatch(/GRANT EXECUTE ON FUNCTION public\.room_round_ledger\(uuid\) TO authenticated;/);
    const hook = read("src/hooks/useRoomPot.ts");
    expect(hook).toMatch(/client\.rpc\("room_round_ledger", \{ p_game_id: gameId \}\)/);
  });

  it("every new function is revoked from PUBLIC and anon before it is granted", () => {
    for (const src of [lock, pot]) {
      const created = [...src.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\(/g)].map((m) => m[1]);
      expect(created.length).toBeGreaterThan(0);
      for (const fn of new Set(created)) {
        // A trigger function is revoked from authenticated too: nobody calls it.
        expect(src, fn).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon(, authenticated)?;`));
      }
    }
  });
});

describe("CI proves both against Postgres", () => {
  it("runs the two suites", () => {
    expect(ci).toContain("supabase/tests/22-lock-the-house.sql");
    expect(ci).toContain("supabase/tests/23-honest-pot.sql");
  });
});
