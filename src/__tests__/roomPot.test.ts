/**
 * A room round is played for a pot, like a quick game is played for a stake.
 *
 * The old room payout was free money: the client worked a number out from
 * placement and raw score and credited itself, and nobody paid anything in —
 * so the more players in a room, the more coins the room made from nothing.
 * A quick game has always been symmetric (500 to lose, 500 to win, decided
 * server-side by settle_quick_game), and the owner's rule is that a room
 * works the same way: every seat pays 500 in, and the table is what gets
 * paid out — winner takes all at two players, 70/20/10 at three or more.
 *
 * The arithmetic is asserted for real against Postgres in
 * supabase/tests/15-room-pot.sql, which is the only place it can be proved
 * (it is SQL, and it moves money). What is checked here is that the client
 * does not name any of the amounts, that the two files agree about the
 * stake, and that a player is told the cost before the round rather than
 * after it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REWARDS } from "@/config/rewardConfig";
import { firstPlaceShare, roundPot } from "@/utils/roomPot";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const migration = read("supabase/migrations/20261015100000_room_round_pot.sql");
const hook = read("src/hooks/useRoomPot.ts");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("the stake is one number, in two files", () => {
  it("the migration stakes what the config says", () => {
    expect(migration).toContain(`v_stake    constant integer := ${REWARDS.GAME_STAKE};`);
  });

  it("and it is the same stake a quick game costs", () => {
    const quick = read("supabase/migrations/20260814120000_settle_quick_game.sql");
    expect(quick).toContain(`v_stake   constant integer := ${REWARDS.GAME_STAKE};`);
  });
});

describe("the split", () => {
  it("is winner-takes-all at two players", () => {
    expect(migration).toMatch(/IF v_players = 2 THEN\s*\n\s*v_prize := CASE WHEN v_row\.place = 1 THEN v_pot ELSE 0 END;/);
  });

  it("and 70 / 20 / 10 at three or more", () => {
    expect(migration).toMatch(/WHEN 1 THEN \(v_pot \* 70\) \/ 100/);
    expect(migration).toMatch(/WHEN 2 THEN \(v_pot \* 20\) \/ 100/);
    expect(migration).toMatch(/WHEN 3 THEN \(v_pot \* 10\) \/ 100/);
  });

  it("with the rounding given to first, so the pot balances to the coin", () => {
    // Integer division loses up to two coins across three shares. Dropping
    // them would make the room a slow coin sink nobody agreed to.
    expect(migration).toMatch(/IF v_row\.place = 1 THEN\s*\n\s*v_prize := v_prize \+ \(v_pot -/);
  });

  it("and a room of one settles nothing at all", () => {
    expect(migration).toMatch(/IF v_players < 2 THEN/);
    expect(migration).toMatch(/'reason', 'practice'/);
  });
});

describe("the client names no amounts", () => {
  it("the hook sends the room and the round, and nothing else", () => {
    expect(hook).toMatch(/rpc\("settle_room_round", \{\s*\n\s*p_room_id: roomId,\s*\n\s*p_game_id: gameId,\s*\n\s*\}\)/);
    // No stake, no prize and no percentage in the code — the doc comment
    // above it describes the rule, the code must not implement it.
    const code = hook.slice(hook.lastIndexOf("export function useRoomPot"));
    expect(code).not.toMatch(/\b70\b|\b20\b|\b10\b|\b500\b/);
  });

  it("and the results screen never credits itself a placement reward", () => {
    // There was one window left — "the function is not deployed yet" paid
    // a client-computed reward. The function has been live for months, and
    // a client naming its own prize is the hole CLAUDE.md rule 3 closes.
    expect(results).not.toMatch(/addCoins\(/);
    expect(results).not.toMatch(/not_deployed/);
    expect(results).not.toMatch(/useCurrency/);
  });

  it("and only the schema-cache code means the function is missing", () => {
    // A permission error whose text names the function is an error.
    expect(hook).toMatch(/const missing = error\.code === "PGRST202";/);
    expect(hook).not.toMatch(/\/settle_room_round\/i\.test/);
  });

  it("what moved is read back from the server, not assumed", () => {
    expect(results).toMatch(/setCoinsEarned\(Math\.max\(0, settlement\.applied\)\)/);
    expect(results).toMatch(/setCoinsLost\(Math\.max\(0, -settlement\.applied\)\)/);
  });
});

describe("a player is told before the round, not after", () => {
  it("the lobby shows what first place takes once there is a pot", () => {
    expect(lobby).toMatch(/seatedPlayers >= 2\s*\n\s*\? \{\s*\n\s*label: t\("lobby\.winnerTakes"\)/);
    // Not the whole pot: "Winner takes" printed 1 500 under a three-player
    // table and the winner took 1 050.
    expect(lobby).toMatch(/amount: firstPlaceShare\(seatedPlayers\) \?\? 0/);
    expect(lobby).not.toMatch(/seatedPlayers \* REWARDS\.GAME_STAKE/);
  });

  it("and so do the preview and rematch sheets, from the same helper", () => {
    const preview = read("src/components/team/RoomPreviewSheet.tsx");
    const rematch = read("src/components/team/RematchWaitSheet.tsx");
    expect(preview).toMatch(/const pot = firstPlaceShare\(players, stake\);/);
    expect(rematch).toMatch(/firstPlaceShare\(playing, stake\) \?\? 0/);
    expect(preview).not.toMatch(/players \* stake/);
    expect(rematch).not.toMatch(/playing \* stake/);
  });

  it("the helper agrees with the migration's arithmetic", () => {
    const s = REWARDS.GAME_STAKE;
    expect(roundPot(1)).toBeNull();
    expect(firstPlaceShare(1)).toBeNull();
    expect(roundPot(2)).toBe(2 * s);
    expect(firstPlaceShare(2)).toBe(2 * s);
    expect(firstPlaceShare(3)).toBe(Math.floor((3 * s * 70) / 100));
    expect(firstPlaceShare(4)).toBe(Math.floor((4 * s * 70) / 100));
    // Rounding goes to first, so first + second + third is the pot.
    const pot = 7;
    expect(firstPlaceShare(pot, 1)).toBe(pot - Math.floor((pot * 20) / 100) - Math.floor((pot * 10) / 100));
  });

  it("and Start refuses a seat the player cannot pay for", () => {
    // On the balance, not on useGameStake's `hasEnoughCoins`, which forgives
    // PRO a quick game's loss — see roomSeatCostsTheStake.test.ts.
    expect(lobby).toMatch(/if \(seatedPlayers >= 2 && !canCoverStake\) \{\s*\n\s*setShowNoStake\(true\);\s*\n\s*return;\s*\n\s*\}/);
    expect(lobby).toMatch(/<NotEnoughStakeModal\s*\n\s*isOpen=\{showNoStake\}/);
  });
});

describe("the money rules the repo already enforces", () => {
  it("the function is revoked from PUBLIC and anon, then granted explicitly", () => {
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.settle_room_round\(uuid, uuid\) FROM PUBLIC, anon;/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.settle_room_round\(uuid, uuid\) TO authenticated;/,
    );
  });

  it("it refuses anyone who is not at the table", () => {
    expect(migration).toMatch(/RAISE EXCEPTION 'authentication required'/);
    expect(migration).toMatch(/RAISE EXCEPTION 'not a participant of this room'/);
  });

  it("and settles a round exactly once, however many devices call it", () => {
    expect(migration).toMatch(/SET stakes_applied = true/);
    expect(migration).toMatch(/AND stakes_applied = false/);
    expect(migration).toMatch(/'reason', 'already_settled'/);
  });

  it("every move is written to the ledger", () => {
    expect(migration).toMatch(/INSERT INTO public\.currency_grants[\s\S]{0,120}'room_stake'/);
    expect(migration).toMatch(/INSERT INTO public\.currency_grants[\s\S]{0,120}'room_prize'/);
  });
});
