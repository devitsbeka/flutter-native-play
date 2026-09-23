import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REWARDS, getChestCoins, getChestGems, isSpecialDay } from "@/config/rewardConfig";

// The economy is balanced around 1 gem = 500 coins, and games are free to
// enter. These tests hold that balance in place: a tweak that quietly breaks
// it fails here instead of on production.

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("economy invariants", () => {
  // Every game is free since 20261108100000_no_wagering: the house pays for a
  // result and nothing is staked. These hold the new balance in place.
  it("keeps one gem worth 500 coins", () => {
    expect(REWARDS.GEM_TO_COINS_RATE).toBe(500);
  });

  it("pays a win, a little for a draw, and nothing is ever taken", () => {
    expect(REWARDS.GAME_WIN_REWARD).toBeGreaterThan(REWARDS.GAME_DRAW_REWARD);
    expect(REWARDS.GAME_DRAW_REWARD).toBeGreaterThan(0);
    expect(REWARDS.GUESS_WIN_REWARD).toBeGreaterThan(0);
    expect(REWARDS).not.toHaveProperty("GAME_STAKE");
    expect(REWARDS).not.toHaveProperty("GUESS_STAKE");
  });

  it("pays room places in falling order", () => {
    const [first, second, third] = REWARDS.ROOM_PLACE_PRIZES;
    expect(first).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(third);
    expect(third).toBeGreaterThan(0);
  });

  it("gives new players a whole number of gems' worth of coins", () => {
    expect(REWARDS.NEW_PLAYER_COINS % REWARDS.GEM_TO_COINS_RATE).toBe(0);
  });

  it("and a subscriber a bigger bundle, the bigger tier the bigger one", () => {
    for (const [tier, bundle] of Object.entries(REWARDS.PRO_WELCOME)) {
      expect(bundle.coins % REWARDS.GEM_TO_COINS_RATE, `${tier} coins`).toBe(0);
      expect(bundle.gems, `${tier} gems`).toBeGreaterThan(0);
    }
    expect(REWARDS.PRO_WELCOME.pro_plus.coins).toBe(REWARDS.PRO_WELCOME.pro.coins * 2);
    expect(REWARDS.PRO_WELCOME.pro_plus.gems).toBe(REWARDS.PRO_WELCOME.pro.gems * 2);
    // And more than a new account gets, which is the point of paying.
    expect(REWARDS.PRO_WELCOME.pro.coins).toBeGreaterThan(REWARDS.NEW_PLAYER_COINS);
  });

  it("prices every power-up below what one win pays", () => {
    for (const [type, price] of Object.entries(REWARDS.POWER_UP_PRICES)) {
      expect(price, `${type} price`).toBeGreaterThan(0);
      expect(price, `${type} price`).toBeLessThan(REWARDS.GAME_WIN_REWARD);
    }
  });

  it("prices all four power-ups", () => {
    expect(Object.keys(REWARDS.POWER_UP_PRICES).sort()).toEqual([
      "5050",
      "freeze",
      "replace",
      "time-drain",
    ]);
  });

  it("makes longer PRO periods cheaper per day, never more expensive", () => {
    const perDay = {
      day: REWARDS.VIP_PRICES.day,
      week: REWARDS.VIP_PRICES.week / 7,
      month: REWARDS.VIP_PRICES.month / 30,
    };
    expect(perDay.week).toBeLessThan(perDay.day);
    expect(perDay.month).toBeLessThan(perDay.week);
  });
});

describe("daily rewards", () => {
  it("runs a complete, correctly numbered 7-day cycle", () => {
    expect(REWARDS.DAILY_REWARDS).toHaveLength(7);
    REWARDS.DAILY_REWARDS.forEach((reward, index) => {
      expect(reward.day).toBe(index + 1);
    });
  });

  it("climbs in coins across the week", () => {
    // Coins, not coins-plus-gems. This asserted total value and passed
    // against a ladder nobody paid: the real one is claim_daily_reward's
    // (20260913100000), where the gems land on days 3, 5 and 7 — so day 4
    // is worth less than day 3 in coin terms and always has been. The
    // gems are the reason to come back on those days; the coin line is
    // what has to keep climbing.
    for (let i = 1; i < REWARDS.DAILY_REWARDS.length; i++) {
      expect(
        REWARDS.DAILY_REWARDS[i].coins,
        `day ${i + 1} pays fewer coins than day ${i}`
      ).toBeGreaterThan(REWARDS.DAILY_REWARDS[i - 1].coins);
    }
  });

  it("and the gems only ever grow, on the days that carry them", () => {
    const withGems = REWARDS.DAILY_REWARDS.filter((r) => r.gems > 0);
    expect(withGems.map((r) => r.day)).toEqual([3, 5, 7]);
    for (let i = 1; i < withGems.length; i++) {
      expect(withGems[i].gems).toBeGreaterThan(withGems[i - 1].gems);
    }
  });

  it("keeps a full week at 5,000 coins' worth", () => {
    const weekValue = REWARDS.DAILY_REWARDS.reduce(
      (sum, r) => sum + r.coins + r.gems * REWARDS.GEM_TO_COINS_RATE,
      0
    );
    // 1,000 coins and 8 gems for seven days of showing
    // up, before the surprise the function rolls on top.
    expect(weekValue).toBe(5000);
  });

  it("and says what the database pays, since the database pays it", () => {
    // The one entry in REWARDS that is not the source of truth. Pinned
    // against the migration that carries the real ladder so the two cannot
    // drift again — which is exactly what happened while nothing read it.
    const ladder = readFileSync(
      join(process.cwd(), "supabase/migrations/20260913100000_daily_reward_ladder.sql"),
      "utf8",
    );
    const rows = ladder.slice(ladder.indexOf("SELECT c INTO v_coins FROM (VALUES"));
    for (const { day, coins } of REWARDS.DAILY_REWARDS) {
      expect(rows, `day ${day}`).toMatch(new RegExp(`\\(${day},\\s*${coins}\\)`));
    }
  });
});

describe("chest", () => {
  it("pays a fixed amount — the chest is never a draw", () => {
    const spy = vi.spyOn(Math, "random");
    for (const roll of [0, 0.5, 0.999999]) {
      spy.mockReturnValue(roll);
      expect(getChestCoins()).toBe(REWARDS.CHEST_COINS);
    }
    expect(Number.isInteger(REWARDS.CHEST_COINS)).toBe(true);
    expect(REWARDS.CHEST_COINS).toBeGreaterThan(0);
  });

  it("opens at most once a day", () => {
    expect(REWARDS.CHEST_COOLDOWN_HOURS).toBe(24);
  });

  it("adds a gem on weekends only", () => {
    // Saturday
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T12:00:00"));
    expect(isSpecialDay()).toBe(true);
    expect(getChestGems()).toBe(REWARDS.CHEST_WEEKEND_GEMS);

    // Sunday
    vi.setSystemTime(new Date("2026-08-09T12:00:00"));
    expect(isSpecialDay()).toBe(true);

    // Monday
    vi.setSystemTime(new Date("2026-08-10T12:00:00"));
    expect(isSpecialDay()).toBe(false);
    expect(getChestGems()).toBe(REWARDS.CHEST_GEMS);

    // Friday
    vi.setSystemTime(new Date("2026-08-07T23:59:00"));
    expect(isSpecialDay()).toBe(false);
  });
});

describe("play regeneration", () => {
  it("regenerates slowly enough to keep plays scarce", () => {
    expect(REWARDS.PLAY_REGEN_HOURS).toBeGreaterThanOrEqual(3);
    expect(REWARDS.PLAY_REGEN_MAX).toBe(1);
  });

  it("caps how many plays a day of ads can produce", () => {
    expect(REWARDS.MAX_ADS_PER_DAY * REWARDS.PLAYS_PER_AD).toBeLessThanOrEqual(5);
  });
});

describe("level up", () => {
  it("awards a fixed coin amount from one of the four power-ups", () => {
    expect(REWARDS.LEVEL_UP_COINS).toBe(150);
    expect([...REWARDS.LEVEL_UP_POWER_UP_TYPES].sort()).toEqual([
      "5050",
      "freeze",
      "replace",
      "time-drain",
    ]);
  });
});
