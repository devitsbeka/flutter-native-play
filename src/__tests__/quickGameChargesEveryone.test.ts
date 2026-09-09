/**
 * One price. A match costs 500, PRO or not, wherever it is played.
 *
 * There were two economies. A ROOM has always charged everyone — the pot is
 * the other players' money, and exempting a subscriber would mean the table
 * funding them (settle_room_round: "Everyone stakes, PRO included"). A QUICK
 * game exempted them: settle_quick_game returned 'vip_free' and took
 * nothing, on the argument that there is nobody on the other side of one.
 *
 * Defensible, and it made "what does a match cost?" un-answerable in one
 * sentence — the question that started this (owner: "per match cost is 500
 * coins, for PRO and no PRO users, same, check it", then "give me sql to
 * charge pro users too on quick games").
 *
 * What a subscription buys instead: unlimited plays, the daily power-ups,
 * the bonus spins, and 25,000 coins with 10 gems on the day it starts. A
 * benefit somebody can see, rather than an invisible discount on every loss.
 *
 * The client half matters as much as the SQL. useGameStake used to answer
 * `hasEnoughCoins` with `isVipFreePlay || canAfford`, so a subscriber with
 * nothing was waved into a game the server would then charge — the same hole
 * that was closed on the room lobby's Start.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REWARDS } from "@/config/rewardConfig";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const migration = read("supabase/migrations/20261102140000_quick_game_charges_everyone.sql");
const hook = read("src/hooks/useGameStake.ts");
const util = read("src/utils/gameStake.ts");

describe("the database charges everybody", () => {
  it("settle_quick_game has no subscription branch left", () => {
    const body = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.settle_quick_game"));
    expect(body).not.toMatch(/vip_free/);
    expect(body).not.toMatch(/vip_subscriptions/);
  });

  it("and still stakes the one amount the rest of the economy uses", () => {
    expect(migration).toContain(`v_stake   constant integer := ${REWARDS.GAME_STAKE};`);
    const pot = read("supabase/migrations/20261015100000_room_round_pot.sql");
    expect(pot).toContain(`v_stake    constant integer := ${REWARDS.GAME_STAKE};`);
  });

  it("with everything else about the settlement untouched", () => {
    // CREATE OR REPLACE takes the whole body, so the rest is reproduced
    // verbatim — and a lost guard here is a lost guard in production.
    const body = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.settle_quick_game"));
    // The once-per-match claim.
    expect(body).toMatch(/AND reference = p_reference\) THEN\s*\n\s*RETURN jsonb_build_object\('applied', 0, 'coins', v_balance, 'reason', 'already_settled'\);/);
    // The debit floored at the balance.
    expect(body).toMatch(/v_delta := -LEAST\(v_stake, GREATEST\(v_balance, 0\)\);/);
    expect(body).toMatch(/'reason', 'no_balance'/);
    // The daily ceiling on wins.
    expect(body).toMatch(/IF v_net_day \+ v_stake > v_ceiling THEN/);
    expect(body).toMatch(/'reason', 'daily_cap'/);
    // The race two devices settling one match can lose safely.
    expect(body).toMatch(/EXCEPTION WHEN unique_violation THEN/);
    // And it is still not anon's to call.
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.settle_quick_game\(text, text\) FROM PUBLIC, anon;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.settle_quick_game\(text, text\) TO authenticated;/);
  });

  it("proved against a real Postgres, like every other money rule", () => {
    const suite = read("supabase/tests/02-assertions.sql");
    expect(suite).toContain("a PRO player pays the stake like everybody else");
    // Nothing ASSERTS the old reason any more; the comment above the block
    // still names it, which is the point of the comment.
    expect(suite).not.toMatch(/->> 'reason'\), 'vip_free'/);
    // And a subscriber's win and loss cancel, like anybody else's.
    expect(suite).toContain("so a win and a loss leave a subscriber exactly where they began");
  });
});

describe("and so does the client", () => {
  it("the stake gate asks the balance and nothing else", () => {
    // `isVipFreePlay || canAfford` let a subscriber with nothing into a game
    // the server would charge, and skipped the modal that explains it.
    expect(hook).toMatch(/const hasEnoughCoins = canAffordCoins\(stakeAmount\);/);
    expect(hook).not.toMatch(/isVipFreePlay \|\| canAffordCoins/);
    expect(hook).toMatch(/const isVipFreePlay = false;/);
  });

  it("the local fallback settles a loss the same way for everyone", () => {
    // Used only where settle_quick_game is missing, but it decided money.
    expect(util).not.toMatch(/if \(isVip\) \{/);
    expect(util).toMatch(/const debit = Math\.min\(REWARDS\.GAME_STAKE, Math\.max\(0, Math\.floor\(coins\)\)\);/);
  });

  it("and the helper that only ever said 'PRO plays free' is gone", () => {
    expect(read("src/utils/vipMultipliers.ts")).not.toMatch(/shouldSkipStake/);
    expect(hook).not.toMatch(/shouldSkipStake/);
  });
});

describe("what a subscription still buys", () => {
  it("the welcome bundle, which is the visible replacement", () => {
    expect(REWARDS.PRO_WELCOME.pro).toEqual({ coins: 25000, gems: 10 });
    expect(REWARDS.PRO_WELCOME.pro_plus).toEqual({ coins: 50000, gems: 20 });
  });

  it("and every other PRO benefit, untouched", () => {
    // Doubled XP, the extra spins, the daily power-ups. Unlimited plays lives
    // in the play-limit hooks and is not a currency rule at all.
    const vip = read("src/utils/vipMultipliers.ts");
    expect(vip).toMatch(/export function calculateXP/);
    expect(vip).toMatch(/export function getMaxDailySpins/);
    expect(vip).toMatch(/export function getVipDailyPowerUps/);
  });
});
