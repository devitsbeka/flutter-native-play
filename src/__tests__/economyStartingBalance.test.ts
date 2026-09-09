/**
 * What an account opens with, and what a subscription opens with.
 *
 * Three settings claimed to decide the starting balance and only one of them
 * ever ran: the DEFAULT on profiles.coins is the grant (handle_new_user
 * inserts a profile without naming it), economy_config said something else,
 * and rewardConfig.ts said a third thing. A subscription, meanwhile, granted
 * no currency at all — PRO's benefit is unlimited plays, which is real and
 * invisible on the balance the day somebody pays for it.
 *
 * The owner's numbers (owner: "coins and gems should be - after sign up -
 * 5 000 coins and 3 gems, pro solo -25 000 coins + 10 gems, friends pro
 * 50 000 coins + 20 gems, check and fix economy_config values"):
 *
 *     sign-up       5,000 coins   3 gems
 *     PRO          25,000 coins  10 gems
 *     Friends PRO  50,000 coins  20 gems
 *
 * What is pinned here is that the four places that state a number state the
 * SAME number: the config the app reads, the column default that grants it,
 * the edge function that pays the bundle, and the config rows an operator
 * sees. They are in four languages in four files and nothing but this test
 * makes them agree.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REWARDS } from "@/config/rewardConfig";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const migration = read("supabase/migrations/20261102100000_starting_balance_and_pro_welcome.sql");
const iap = read("supabase/functions/_shared/iap.ts");
const economyHook = read("src/hooks/useEconomyConfig.ts");

/** `('id', 5000, ...)` → 5000. */
const configValue = (id: string): number => {
  const m = migration.match(new RegExp(`\\('${id}',\\s*(-?\\d+),`));
  if (!m) throw new Error(`economy_config row '${id}' is not in the migration`);
  return Number(m[1]);
};

describe("a new account", () => {
  it("is funded by the column default, which is what actually grants it", () => {
    expect(migration).toMatch(
      /ALTER TABLE public\.profiles\s*\n\s*ALTER COLUMN coins SET DEFAULT 5000,\s*\n\s*ALTER COLUMN gems\s+SET DEFAULT 3;/,
    );
  });

  it("with the config saying the same, in both the app and the table", () => {
    expect(REWARDS.NEW_PLAYER_COINS).toBe(5000);
    expect(REWARDS.NEW_PLAYER_GEMS).toBe(3);
    expect(configValue("new_player_coins")).toBe(REWARDS.NEW_PLAYER_COINS);
    expect(configValue("new_player_gems")).toBe(REWARDS.NEW_PLAYER_GEMS);
  });

  it("and existing accounts are left alone — this is a starting balance, not a top-up", () => {
    expect(migration).not.toMatch(/UPDATE public\.profiles\s+SET coins/);
  });
});

describe("a subscription", () => {
  it("opens with a bundle per tier, the same one in the code and the config", () => {
    expect(REWARDS.PRO_WELCOME.pro).toEqual({ coins: 25000, gems: 10 });
    expect(REWARDS.PRO_WELCOME.pro_plus).toEqual({ coins: 50000, gems: 20 });
    expect(configValue("pro_welcome_coins")).toBe(REWARDS.PRO_WELCOME.pro.coins);
    expect(configValue("pro_welcome_gems")).toBe(REWARDS.PRO_WELCOME.pro.gems);
    expect(configValue("pro_plus_welcome_coins")).toBe(REWARDS.PRO_WELCOME.pro_plus.coins);
    expect(configValue("pro_plus_welcome_gems")).toBe(REWARDS.PRO_WELCOME.pro_plus.gems);
  });

  it("and the store sync pays exactly those amounts", () => {
    // The edge function cannot import from src/ — it runs on Deno with its
    // own module graph — so the table is written out there and checked here.
    const table = iap.slice(iap.indexOf("export const SUBSCRIPTION_WELCOME"), iap.indexOf("export function lookupProduct"));
    for (const [tier, bundle] of Object.entries(REWARDS.PRO_WELCOME)) {
      expect(table, tier).toMatch(
        new RegExp(`${tier}: \\{ coins: ${bundle.coins}, gems: ${bundle.gems} \\}`),
      );
    }
    // Friends PRO is the pro_plus tier: the annual and the proplus monthly
    // products both grant it, and it is the tier the seat allowance reads.
    expect(iap).toMatch(/\[PRODUCTS\.PRO_PLUS_MONTHLY\]: \{ kind: "subscription", tier: "pro_plus" \}/);
    expect(iap).toMatch(/\[PRODUCTS\.PRO_ANNUAL\]: \{ kind: "subscription", tier: "pro_plus" \}/);
    // ad_free is not a subscription tier and is not in the table.
    expect(table).not.toMatch(/ad_free/);
  });

  it("once per person per tier, claimed before a coin moves", () => {
    // This runs on every sync — every renewal the webhook reports and every
    // "restore purchases" — so the claim is the only thing between the
    // bundle and a monthly salary. Keyed on the user and the tier, not on a
    // transaction id, because a renewal brings a new transaction id.
    expect(iap).toMatch(/const eventId = `welcome:\$\{userId\}:\$\{tier\}`;/);
    expect(iap).toMatch(/event_type: "SUBSCRIPTION_WELCOME",/);
    const fn = iap.slice(iap.indexOf("async function creditSubscriptionWelcome"));
    // Claim first, credit second: the reverse pays twice on a retry.
    expect(fn.indexOf('from("iap_events").insert')).toBeLessThan(fn.indexOf("update_user_currency"));
    expect(fn).toMatch(/if \(claimError\.code !== "23505"\)/);
    // And a failed credit releases the claim rather than leaving somebody
    // paid-up and empty-handed.
    expect(fn).toMatch(/if \(creditError\) \{\s*\n\s*await supabase\.from\("iap_events"\)\.delete\(\)\.eq\("event_id", eventId\);/);
  });

  it("credited by the service role, which is the only caller allowed to add", () => {
    // update_user_currency refuses a positive delta from a signed-in caller
    // (20260813210000); the edge function holds the service-role key. Same
    // path the gem packs use.
    expect(iap).toMatch(/rpc\("update_user_currency", \{\s*\n\s*p_user_id: userId,\s*\n\s*p_coins_delta: bundle\.coins,\s*\n\s*p_gems_delta: bundle\.gems,\s*\n\s*\}\)/);
  });

  it("after the subscription row is written, not instead of it", () => {
    expect(iap).toMatch(
      /if \(error\) throw error;\s*\n\s*await creditSubscriptionWelcome\(supabase, userId, best\.tier, best\);/,
    );
  });
});

describe("and the database grants it too, without waiting on a deploy", () => {
  const trigger = read("supabase/migrations/20261102110000_pro_welcome_in_the_database.sql");

  it("the same bundle, from a trigger on the subscription row", () => {
    // Edge functions reach this project through Lovable (CLAUDE.md 4a), so
    // an iap.ts change is live whenever that happens. A trigger is live as
    // soon as the SQL is applied, and it also catches subscriptions the
    // store never wrote — an admin grant, grant_vip_days, a referral.
    expect(trigger).toMatch(/CREATE TRIGGER vip_subscriptions_welcome\s*\n\s*AFTER INSERT OR UPDATE OF vip_tier, expires_at ON public\.vip_subscriptions/);
    expect(trigger).toMatch(/IF NEW\.vip_tier NOT IN \('pro', 'pro_plus'\) THEN\s*\n\s*RETURN NEW;/);
    expect(trigger).toMatch(/IF NEW\.expires_at <= now\(\) THEN\s*\n\s*RETURN NEW;/);
  });

  it("and cannot pay twice with the edge function, because they share one claim", () => {
    // The key is the whole safety argument: whichever path runs first takes
    // the iap_events row and the other reads a conflict and stops.
    expect(trigger).toMatch(/'welcome:' \|\| NEW\.user_id::text \|\| ':' \|\| NEW\.vip_tier,/);
    expect(iap).toMatch(/const eventId = `welcome:\$\{userId\}:\$\{tier\}`;/);
    expect(trigger).toMatch(/ON CONFLICT \(event_id\) DO NOTHING;/);
    expect(trigger).toMatch(/GET DIAGNOSTICS v_claimed = ROW_COUNT;\s*\n\s*IF v_claimed = 0 THEN\s*\n\s*RETURN NEW;/);
  });

  it("reads the amounts from economy_config, so the admin screen decides them", () => {
    expect(trigger).toMatch(/FROM public\.economy_config\s*\n\s*WHERE id = CASE NEW\.vip_tier WHEN 'pro' THEN 'pro_welcome_coins'/);
    // With the seeded numbers as the fallback, for a database missing a row.
    expect(trigger).toMatch(
      new RegExp(`CASE NEW\\.vip_tier WHEN 'pro' THEN ${REWARDS.PRO_WELCOME.pro.coins} ELSE ${REWARDS.PRO_WELCOME.pro_plus.coins} END\\)`),
    );
  });

  it("and registers its ledger kind at zero, so no client can mint through it", () => {
    // credit_gameplay_reward refuses an unknown kind, so registering it is
    // what would open it; at 0/0 it stays shut. The trigger writes the
    // ledger row itself.
    expect(trigger).toMatch(/\('pro_welcome',\s*0,\s*0,\s*0,\s*0\)/);
    expect(trigger).toMatch(/INSERT INTO public\.currency_grants \(user_id, kind, coins, gems, reference\)/);
  });

  it("proved against a real Postgres, where money rules have to be", () => {
    const suite = read("supabase/tests/16-pro-welcome.sql");
    for (const claim of [
      "PRO opens with 25,000 coins",
      "Friends PRO opens with 50,000 coins",
      "a renewal grants nothing",
      "an expired subscription grants nothing",
      "ad-free is not a subscription tier and grants nothing",
    ]) {
      expect(suite, claim).toContain(claim);
    }
    // And CI runs it, which the room pot file spent a while not being.
    expect(read(".github/workflows/pr-checks.yml")).toContain("supabase/tests/16-pro-welcome.sql");
  });
});

describe("economy_config tells the truth about the rest of it too", () => {
  it("the stake, the win and the draw", () => {
    expect(configValue("game_stake")).toBe(REWARDS.GAME_STAKE);
    expect(configValue("game_win_reward")).toBe(REWARDS.GAME_WIN_REWARD);
    expect(configValue("game_draw_refund")).toBe(REWARDS.GAME_DRAW_REFUND);
  });

  it("one gem is one stake, which is what exchange_currency has always paid", () => {
    expect(configValue("gem_to_coins_rate")).toBe(REWARDS.GEM_TO_COINS_RATE);
    expect(REWARDS.GEM_TO_COINS_RATE).toBe(REWARDS.GAME_STAKE);
  });

  it("the daily ladder, day by day", () => {
    REWARDS.DAILY_REWARDS.forEach((day) => {
      expect(configValue(`daily_reward_day_${day.day}`), `day ${day.day}`).toBe(day.coins);
    });
  });

  it("the chest and the power-ups", () => {
    expect(configValue("chest_coins_min")).toBe(REWARDS.CHEST_COINS_MIN);
    expect(configValue("chest_coins_max")).toBe(REWARDS.CHEST_COINS_MAX);
    expect(configValue("chest_cooldown_hours")).toBe(REWARDS.CHEST_COOLDOWN_HOURS);
    expect(configValue("powerup_price_5050")).toBe(REWARDS.POWER_UP_PRICES["5050"]);
    expect(configValue("powerup_price_freeze")).toBe(REWARDS.POWER_UP_PRICES.freeze);
    expect(configValue("powerup_price_replace")).toBe(REWARDS.POWER_UP_PRICES.replace);
  });

  it("and it is written as an upsert, because some of these rows are new", () => {
    expect(migration).toMatch(/ON CONFLICT \(id\) DO UPDATE\s*\n\s*SET value\s+= EXCLUDED\.value,/);
  });

  it("the app's own fallback is the same config, not a second copy of it", () => {
    // DEFAULT_CONFIG was typed out by hand and drifted: a win paying 1000
    // against a 500 stake, a gem worth 50 coins. It reads REWARDS now, so
    // there is nothing left to drift.
    expect(economyHook).toMatch(/gameStake: REWARDS\.GAME_STAKE,/);
    expect(economyHook).toMatch(/gemToCoinsRate: REWARDS\.GEM_TO_COINS_RATE,/);
    expect(economyHook).toMatch(/newPlayerCoins: REWARDS\.NEW_PLAYER_COINS,/);
    expect(economyHook).toMatch(/newPlayerGems: REWARDS\.NEW_PLAYER_GEMS,/);
    expect(economyHook).not.toMatch(/gemToCoinsRate: 50,/);
  });
});
