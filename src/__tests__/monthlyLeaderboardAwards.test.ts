import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MONTHLY_PRIZES,
  formatPeriod,
  medalForRank,
  monthPeriod,
  monthlyPrize,
} from "@/config/leaderboardMonthly";
import { countAwards, type MonthlyAward } from "@/hooks/useMonthlyAwards";

/**
 * Finishing in a month's top three pays, once, and shows on your profile.
 *
 * The behaviour of the payout itself is asserted against a real Postgres in
 * `supabase/tests/25-month-awards.sql` — who wins, who is excluded, that it
 * pays once and that nobody can call the payout directly. This file covers
 * the half that runs on a phone: that the screens quote the same prizes the
 * database pays, and that the award can only ever arrive from the server.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const MIGRATION = read("supabase/migrations/20261107110000_monthly_leaderboard_awards.sql");
const HOOK = read("src/hooks/useMonthlyAwards.ts");
const CHIPS = read("src/components/profile/MonthlyAwardChips.tsx");
const BOARD = read("src/pages/Leaderboards.tsx");
const MODAL = read("src/components/profile/PlayerProfileModal.tsx");

describe("the prizes the screens quote", () => {
  it("are the ones the database pays", () => {
    // The daily ladder drifted to a completely different set of numbers from
    // the ones in rewardConfig because nothing compared them. This does.
    const rows = [...MIGRATION.matchAll(/\('(global|country)',\s*(\d),\s*(\d+),\s*(\d+)\)/g)].map(
      (m) => ({ scope: m[1], rank: Number(m[2]), coins: Number(m[3]), gems: Number(m[4]) }),
    );
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      const prize = monthlyPrize(row.scope as "global" | "country", row.rank);
      expect(prize, `${row.scope} #${row.rank} is missing from MONTHLY_PRIZES`).not.toBeNull();
      expect(prize!.coins, `${row.scope} #${row.rank} coins`).toBe(row.coins);
      expect(prize!.gems, `${row.scope} #${row.rank} gems`).toBe(row.gems);
    }
  });

  it("cover exactly the three places that are awarded", () => {
    expect(MONTHLY_PRIZES).toHaveLength(6);
    expect(monthlyPrize("global", 4)).toBeNull();
    expect(MIGRATION).toMatch(/rank\s+integer NOT NULL CHECK \(rank BETWEEN 1 AND 3\)/);
  });

  it("pay more globally than in one country, at every place", () => {
    for (const rank of [1, 2, 3] as const) {
      expect(monthlyPrize("global", rank)!.coins).toBeGreaterThan(
        monthlyPrize("country", rank)!.coins,
      );
    }
  });

  it("and pay less the further down the podium", () => {
    for (const scope of ["global", "country"] as const) {
      expect(monthlyPrize(scope, 1)!.coins).toBeGreaterThan(monthlyPrize(scope, 2)!.coins);
      expect(monthlyPrize(scope, 2)!.coins).toBeGreaterThan(monthlyPrize(scope, 3)!.coins);
      expect(monthlyPrize(scope, 1)!.gems).toBeGreaterThan(monthlyPrize(scope, 3)!.gems);
    }
  });
});

describe("what counts as earning it", () => {
  it("is not a coin anybody bought", () => {
    // Otherwise first place costs 24 gems: coins_15000 is a shop pack.
    const kinds = MIGRATION.slice(
      MIGRATION.indexOf("INSERT INTO public.leaderboard_earning_kinds"),
      MIGRATION.indexOf("ON CONFLICT (kind) DO NOTHING"),
    );
    for (const bought of ["shop_grant", "exchange", "shop_purchase", "pro_welcome"]) {
      expect(kinds, bought).not.toContain(`'${bought}'`);
    }
  });

  it("is not the award itself, or winning would help you win again", () => {
    const kinds = MIGRATION.slice(
      MIGRATION.indexOf("INSERT INTO public.leaderboard_earning_kinds"),
      MIGRATION.indexOf("ON CONFLICT (kind) DO NOTHING"),
    );
    expect(kinds).not.toContain("'month_award'");
    expect(MIGRATION).toMatch(/'month_award', v_coins, v_gems/);
  });

  it("is an allowlist, so a grant kind invented later cannot quietly count", () => {
    expect(MIGRATION).toMatch(/JOIN public\.leaderboard_earning_kinds k ON k\.kind = g\.kind/);
  });

  it("is a month of the ledger, not a balance", () => {
    // The whole point: the RATING board ranks on profiles.coins, and paying
    // the top of a balance board makes the leader's lead permanent.
    expect(MIGRATION).toMatch(/FROM public\.currency_grants g/);
    expect(MIGRATION).toMatch(/g\.created_at >= p_period/);
    expect(MIGRATION).toMatch(/g\.created_at <\s+\(p_period \+ interval '1 month'\)/);
  });
});

describe("the payout cannot be asked for", () => {
  it("is revoked from everyone, including signed-in players", () => {
    expect(MIGRATION).toMatch(
      /REVOKE ALL ON FUNCTION public\.pay_month_award\([^)]*\)\s*\n?\s*FROM PUBLIC, anon, authenticated;/,
    );
  });

  it("and the awards table has no client write policy", () => {
    const policies = [...MIGRATION.matchAll(/CREATE POLICY "([^"]+)"\n\s*ON public\.leaderboard_month_awards FOR (\w+)/g)];
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) expect(p[2]).toBe("SELECT");
  });

  it("while settling is safe to call, and is not for anon", () => {
    // It decides everything itself, so the worst a caller can do is pay the
    // people who won.
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.settle_leaderboard_month\(\) FROM PUBLIC, anon;/);
    expect(MIGRATION).toMatch(/GRANT EXECUTE ON FUNCTION public\.settle_leaderboard_month\(\) TO authenticated;/);
  });

  it("and two people settling at once cannot both pay", () => {
    expect(MIGRATION).toMatch(/pg_try_advisory_xact_lock\(hashtext\('settle_leaderboard_month'\)\)/);
  });

  it("nor can one month be settled twice, or one player paid twice in it", () => {
    expect(MIGRATION).toMatch(/leaderboard_month_awards_slot_idx[\s\S]{0,160}COALESCE\(country_code, ''\)/);
    expect(MIGRATION).toMatch(/leaderboard_month_awards_one_per_user_idx\s*\n\s*ON public\.leaderboard_month_awards \(period, user_id\)/);
  });
});

describe("the client's part", () => {
  it("settles once per run, not once per screen", () => {
    expect(HOOK).toMatch(/let settlePromise: Promise<void> \| null = null;/);
    expect(HOOK).toMatch(/if \(!settlePromise\) \{/);
  });

  it("is triggered by opening the leaderboard, since nothing else fires", () => {
    expect(BOARD).toMatch(/if \(user\) void settleMonthsOnce\(\);/);
    expect(BOARD).toMatch(/from "@\/hooks\/useMonthlyAwards"/);
  });

  it("never treats a failed settle as fatal", () => {
    // A late trophy is not a lost one: the ledger it is decided from does
    // not move, so the next caller settles the same months.
    expect(HOOK).toMatch(/console\.warn\("\[month-awards\] settle failed:/);
  });

  it("reads awards by user, because a profile shows somebody else's", () => {
    expect(HOOK).toMatch(/export function useMonthlyAwards\(userId\?: string \| null\)/);
    expect(HOOK).toMatch(/\.eq\("user_id", userId\)/);
    expect(MIGRATION).toMatch(/CREATE POLICY "Awards are public"/);
  });

  it("and marking one seen is the only thing it can write", () => {
    expect(HOOK).toMatch(/callRpc\("mark_month_award_seen", \{ p_award_id: awardId \}\)/);
    // seen_at is a "has the card been opened", never a condition of payment.
    expect(MIGRATION).toMatch(/seen_at\s+timestamptz/);
    expect(HOOK).not.toMatch(/claim/i);
  });
});

describe("what a trophy says", () => {
  it("counts repeats of the same place on the same board", () => {
    const award = (over: Partial<MonthlyAward>): MonthlyAward => ({
      id: Math.random().toString(),
      period: "2026-09-01",
      scope: "global",
      country_code: null,
      rank: 1,
      user_id: "u",
      coins: 15000,
      gems: 3,
      earned_coins: 1,
      seen_at: null,
      ...over,
    });
    const awards = [
      award({ period: "2026-09-01" }),
      award({ period: "2026-08-01" }),
      award({ scope: "country", country_code: "GE", coins: 5000 }),
      award({ rank: 2, coins: 5000 }),
    ];
    expect(countAwards(awards, "global", 1)).toBe(2);
    expect(countAwards(awards, "country", 1)).toBe(1);
    expect(countAwards(awards, "global", 3)).toBe(0);
  });

  it("shows at most two, so a profile does not become a scoreboard again", () => {
    // The trophy grid was taken out of the profile on purpose. This is a row
    // of chips under the name, not that section coming back.
    expect(CHIPS).toMatch(/const shown = ranked\.slice\(0, 2\);/);
    expect(CHIPS).toMatch(/if \(loading \|\| awards\.length === 0\) return null;/);
    expect(MODAL).toMatch(/<MonthlyAwardChips userId=\{data\.profile\.user_id\} \/>/);
  });

  it("names the month in UTC, so the label does not shift with the reader", () => {
    // new Date("2026-09-01") is midnight UTC and prints as August anywhere
    // west of London.
    expect(formatPeriod("2026-09-01", "en-US")).toBe("September 2026");
    expect(formatPeriod("2026-01-01", "en-US")).toBe("January 2026");
    expect(formatPeriod("nonsense", "en-US")).toBe("nonsense");
  });

  it("and a period is the first day of its month", () => {
    expect(monthPeriod(new Date(Date.UTC(2026, 8, 20, 23, 30)))).toBe("2026-09-01");
    expect(monthPeriod(new Date(Date.UTC(2026, 0, 1, 0, 0)))).toBe("2026-01-01");
  });

  it("wears the right medal", () => {
    expect(medalForRank(1)).toBe("🥇");
    expect(medalForRank(2)).toBe("🥈");
    expect(medalForRank(3)).toBe("🥉");
    expect(medalForRank(4)).toBe("");
  });

  it("in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/monthAwardTitle: "[^"]+",/);
    }
  });
});
