/**
 * A room round is free, and the house pays the places.
 *
 * It used to be played for a pot: every seat paid 500 in, the table was
 * paid out 70/20/10, and a player who could not cover the stake was turned
 * away at the door. App Review rejected the app under the simulated-gambling
 * rule — coins, which gems buy, went into a round and came out to whoever
 * won it. Since 20261108100000_no_wagering nobody pays in and nobody loses
 * coins: first, second and third are paid by the house
 * (REWARDS.ROOM_PLACE_PRIZES), only first at two players.
 *
 * The arithmetic is asserted for real against Postgres in
 * supabase/tests/26-no-wagering.sql. What is checked here is that the client
 * names none of the amounts, that the config and the migration agree, that
 * every screen promises prizes rather than a pot, and that no door in the
 * room flow asks for a balance.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REWARDS } from "@/config/rewardConfig";
import { firstPlacePrize, placePrizes, prizeLadderText } from "@/utils/roomPrizes";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const migration = read("supabase/migrations/20261108100000_no_wagering.sql");
const hook = read("src/hooks/useRoomPrizes.ts");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

/** Every file of the room flow, which between them must not ask for coins. */
const ROOM_FLOW = [
  "src/components/team/RoomLobbyV2.tsx",
  "src/components/team/PublicRoomsSection.tsx",
  "src/components/team/MyRoomsSection.tsx",
  "src/components/team/MatchSummarySheet.tsx",
  "src/components/team/RematchSheet.tsx",
  "src/components/team/RematchGate.tsx",
  "src/components/team/RoomPreviewSheet.tsx",
  "src/components/team/MultiplayerGameScreenV2.tsx",
  "src/components/team/GameResultsScreenV2.tsx",
];

describe("the prizes are one ladder, in two files", () => {
  it("the migration pays what the config says", () => {
    const [first, second, third] = REWARDS.ROOM_PLACE_PRIZES;
    expect(migration).toMatch(
      new RegExp(`WHEN v_players = 2 THEN CASE WHEN g\\.p = 1 THEN ${first} ELSE 0 END`),
    );
    expect(migration).toMatch(
      new RegExp(`ELSE CASE g\\.p WHEN 1 THEN ${first} WHEN 2 THEN ${second} WHEN 3 THEN ${third} ELSE 0 END`),
    );
  });

  it("and collects nothing: no seat is debited", () => {
    const start = migration.indexOf("FUNCTION public.settle_room_round");
    const fn = migration.slice(start, migration.indexOf("$$;", start));
    expect(fn).not.toMatch(/coins - /);
    expect(fn).not.toMatch(/'room_stake'/);
    expect(fn).toMatch(/'pot', 0,/);
  });

  it("the helper agrees with the migration", () => {
    expect(placePrizes(1)).toBeNull();
    expect(firstPlacePrize(1)).toBeNull();
    expect(placePrizes(2)).toEqual([REWARDS.ROOM_PLACE_PRIZES[0]]);
    expect(placePrizes(3)).toEqual(REWARDS.ROOM_PLACE_PRIZES);
    expect(placePrizes(10)).toEqual(REWARDS.ROOM_PLACE_PRIZES);
    expect(firstPlacePrize(2)).toBe(REWARDS.ROOM_PLACE_PRIZES[0]);
  });

  it("and says them as one line", () => {
    const t = (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params)}`;
    expect(prizeLadderText(t, 2)).toBe(`playRewards.prizeWinnerOnly:${JSON.stringify({ first: "200" })}`);
    expect(prizeLadderText(t)).toBe(
      `playRewards.prizeLadder:${JSON.stringify({ first: "200", second: "100", third: "50" })}`,
    );
  });
});

describe("the client names no amounts", () => {
  it("the hook sends the room and the round, and nothing else", () => {
    expect(hook).toMatch(/rpc\("settle_room_round", \{\s*\n\s*p_room_id: roomId,\s*\n\s*p_game_id: gameId,\s*\n\s*\}\)/);
    const code = hook.slice(hook.lastIndexOf("export function useRoomPrizes"));
    expect(code).not.toMatch(/\b200\b|\b100\b|\b50\b|\b500\b/);
  });

  it("and never draws a debit, even off an old round's ledger", () => {
    // Rounds settled before the migration still carry a stake line.
    expect(hook).toMatch(/line\.prize \+= Math\.max\(0, d\.prize \?\? 0\);/);
    expect(hook).not.toMatch(/staked\s*\+=/);
    expect(hook).toMatch(/data\.coins > balanceBefore/);
  });

  it("and the results screen never credits itself a placement reward", () => {
    expect(results).not.toMatch(/addCoins\(/);
    expect(results).not.toMatch(/not_deployed/);
    expect(results).not.toMatch(/useCurrency/);
    expect(results).toMatch(/setCoinsEarned\(Math\.max\(0, settlement\.applied\)\)/);
    expect(results).not.toMatch(/coinsLost/);
  });

  it("only the schema-cache code means the function is missing", () => {
    expect(hook).toMatch(/const missing = error\.code === "PGRST202";/);
  });
});

describe("a player is told what winning is worth before the round", () => {
  it("the lobby shows what first place earns once there is a table", () => {
    expect(lobby).toMatch(/seatedPlayers >= 2\s*\n\s*\? \{\s*\n\s*label: t\("playRewards\.winnerEarns"\)/);
    expect(lobby).toMatch(/amount: firstPlacePrize\(seatedPlayers\) \?\? 0/);
  });

  it("and the summary, preview and rematch sheets say the prizes, and that it is free", () => {
    for (const file of [
      "src/components/team/MatchSummarySheet.tsx",
      "src/components/team/RoomPreviewSheet.tsx",
      "src/components/team/RematchSheet.tsx",
    ]) {
      const src = read(file);
      expect(src, file).toMatch(/t\("playRewards\.prizesLabel"\)/);
      expect(src, file).toMatch(/<PrizeLadder t=\{t\}/);
      expect(src, file).toMatch(/t\("playRewards\.freeToPlay"\)/);
    }
    expect(read("src/components/team/RematchGate.tsx")).toMatch(/t\("playRewards\.freeToPlay"\)/);
  });
});

describe("no door in the room flow asks for coins", () => {
  it.each(ROOM_FLOW)("%s has no stake, no pot and no balance gate", (file) => {
    const src = read(file);
    expect(src).not.toMatch(/NotEnoughStakeModal/);
    expect(src).not.toMatch(/GAME_STAKE|canCoverStake|showNoStake/);
    expect(src).not.toMatch(/lobby\.summaryStake|lobby\.winnerTakes|extra\.roundPotLabel/);
    expect(src).not.toMatch(/useRoomPot|utils\/roomPot/);
  });

  it("a rematch ask no longer carries a stake, and an old one's is never shown", () => {
    expect(lobby).not.toMatch(/stake:/);
    expect(read("src/utils/rematchRequests.ts")).toMatch(
      /export type RematchMatch = Pick<RematchRequestData, "rounds" \| "questions_per_round">;/,
    );
    expect(read("src/components/team/RematchGate.tsx")).not.toMatch(/data\.stake/);
  });

  it("leaving a live round says it costs nothing", () => {
    expect(read("src/components/team/MultiplayerGameScreenV2.tsx")).toMatch(
      /<AlertDialogDescription>\{t\("playRewards\.leaveRoundBody"\)\}<\/AlertDialogDescription>/,
    );
  });
});

describe("the money rules the repo already enforces", () => {
  it("the function is revoked from PUBLIC and anon, then granted explicitly", () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.settle_room_round\(uuid, uuid\) FROM PUBLIC, anon;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.settle_room_round\(uuid, uuid\) TO authenticated;/);
  });

  it("the prizes are inside the daily room_prize ceiling", () => {
    expect(migration).toMatch(/FROM public\.currency_grant_limits WHERE kind = 'room_prize';/);
  });

  it("is proved against Postgres, and CI runs that file", () => {
    const sqlTest = read("supabase/tests/26-no-wagering.sql");
    expect(sqlTest).toMatch(/no room round ever wrote a debit/);
    expect(read(".github/workflows/pr-checks.yml")).toMatch(/-f supabase\/tests\/26-no-wagering\.sql/);
  });
});
