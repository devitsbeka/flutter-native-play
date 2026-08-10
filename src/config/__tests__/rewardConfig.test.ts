import { describe, it, expect, afterEach, vi } from "vitest";
import { REWARDS, getChestGems, getRandomChestCoins, isSpecialDay } from "@/config/rewardConfig";

// The economy is balanced around 1 gem = 500 coins = one game stake. These
// tests hold that balance in place: a tweak that quietly breaks the ratio
// (or hands out a free game) fails here instead of on production.

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("economy invariants", () => {
  it("keeps one gem worth exactly one game stake", () => {
    expect(REWARDS.GEM_TO_COINS_RATE).toBe(500);
    expect(REWARDS.GAME_STAKE).toBe(REWARDS.GEM_TO_COINS_RATE);
  });

  it("keeps a loss and a draw from paying out", () => {
    expect(REWARDS.GAME_LOSE_REWARD).toBe(0);
    expect(REWARDS.GAME_DRAW_REFUND).toBe(0);
  });

  it("never lets a win pay more than twice the stake", () => {
    expect(REWARDS.GAME_WIN_REWARD).toBeGreaterThan(0);
    expect(REWARDS.GAME_WIN_REWARD).toBeLessThanOrEqual(REWARDS.GAME_STAKE);
  });

  it("gives new players a whole number of free games", () => {
    expect(REWARDS.NEW_PLAYER_COINS % REWARDS.GAME_STAKE).toBe(0);
    expect(REWARDS.NEW_PLAYER_COINS / REWARDS.GAME_STAKE).toBe(6);
  });

  it("prices every power-up below a full game stake", () => {
    for (const [type, price] of Object.entries(REWARDS.POWER_UP_PRICES)) {
      expect(price, `${type} price`).toBeGreaterThan(0);
      expect(price, `${type} price`).toBeLessThan(REWARDS.GAME_STAKE);
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

  it("never decreases as the streak grows", () => {
    for (let i = 1; i < REWARDS.DAILY_REWARDS.length; i++) {
      const value = (r: (typeof REWARDS.DAILY_REWARDS)[number]) =>
        r.coins + r.gems * REWARDS.GEM_TO_COINS_RATE;
      expect(
        value(REWARDS.DAILY_REWARDS[i]),
        `day ${i + 1} pays less than day ${i}`
      ).toBeGreaterThan(value(REWARDS.DAILY_REWARDS[i - 1]));
    }
  });

  it("keeps a full week below the advertised ~6,750 coin value", () => {
    const weekValue = REWARDS.DAILY_REWARDS.reduce(
      (sum, r) => sum + r.coins + r.gems * REWARDS.GEM_TO_COINS_RATE,
      0
    );
    expect(weekValue).toBe(5150);
    expect(weekValue).toBeLessThan(REWARDS.GAME_STAKE * 15);
  });
});

describe("chest", () => {
  it("stays inside its advertised coin range", () => {
    const spy = vi.spyOn(Math, "random");
    for (const roll of [0, 0.5, 0.999999]) {
      spy.mockReturnValue(roll);
      const coins = getRandomChestCoins();
      expect(coins).toBeGreaterThanOrEqual(REWARDS.CHEST_COINS_MIN);
      expect(coins).toBeLessThanOrEqual(REWARDS.CHEST_COINS_MAX);
      expect(Number.isInteger(coins)).toBe(true);
    }
  });

  it("can reach both ends of the range", () => {
    const spy = vi.spyOn(Math, "random");
    spy.mockReturnValue(0);
    expect(getRandomChestCoins()).toBe(REWARDS.CHEST_COINS_MIN);
    spy.mockReturnValue(0.9999999);
    expect(getRandomChestCoins()).toBe(REWARDS.CHEST_COINS_MAX);
  });

  it("never pays a full game stake in one chest", () => {
    expect(REWARDS.CHEST_COINS_MAX).toBeLessThan(REWARDS.GAME_STAKE);
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

describe("lucky spin", () => {
  it("never puts more than one game stake on a single spin", () => {
    for (const reward of REWARDS.SPIN_REWARDS) {
      const value =
        reward.type === "gems" ? reward.value * REWARDS.GEM_TO_COINS_RATE : reward.value;
      if (reward.type === "powerup") continue;
      expect(value, reward.label).toBeLessThanOrEqual(REWARDS.GAME_STAKE);
    }
  });

  it("has a reward for every slot", () => {
    expect(REWARDS.SPIN_REWARDS.length).toBeGreaterThan(0);
    for (const reward of REWARDS.SPIN_REWARDS) {
      expect(reward.value).toBeGreaterThan(0);
      expect(reward.label.length).toBeGreaterThan(0);
    }
  });
});
