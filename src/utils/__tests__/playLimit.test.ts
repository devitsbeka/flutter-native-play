import { describe, it, expect } from "vitest";
import {
  MAX_FREE_PLAYS,
  REGEN_MS,
  WINDOW_MS,
  formatCountdown,
  isWindowExpired,
  resolvePlayLimit,
  spendPlayFromWindow,
  type PlayLimitInput,
} from "@/utils/playLimit";

const NOW = Date.UTC(2026, 7, 10, 12, 0, 0);
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const base: PlayLimitInput = {
  now: NOW,
  isVip: false,
  windowMode: true,
  playWindow: null,
  gamesPlayed: 0,
  lastRegenAt: null,
  regenConsumedLocally: false,
};

const at = (overrides: Partial<PlayLimitInput> = {}) =>
  resolvePlayLimit({ ...base, ...overrides });

describe("window rule", () => {
  it("gives a brand new player the full five games", () => {
    const state = at();
    expect(state.playsRemaining).toBe(MAX_FREE_PLAYS);
    expect(state.canPlay).toBe(true);
    expect(state.freeGamesExhausted).toBe(false);
  });

  it("counts down as plays are spent inside the window", () => {
    for (let used = 0; used <= MAX_FREE_PLAYS; used++) {
      const state = at({ playWindow: { used, start: NOW - HOUR } });
      expect(state.playsRemaining, `used ${used}`).toBe(MAX_FREE_PLAYS - used);
    }
  });

  it("blocks play once the five are gone", () => {
    const state = at({ playWindow: { used: 5, start: NOW - HOUR } });
    expect(state.canPlay).toBe(false);
    expect(state.freeGamesExhausted).toBe(true);
  });

  it("never reports negative plays if the server over-counted", () => {
    const state = at({ playWindow: { used: 99, start: NOW - HOUR } });
    expect(state.playsRemaining).toBe(0);
  });

  it("refills the moment the window ages out", () => {
    const justInside = at({ playWindow: { used: 5, start: NOW - WINDOW_MS + 1 } });
    expect(justInside.playsRemaining).toBe(0);

    const justExpired = at({ playWindow: { used: 5, start: NOW - WINDOW_MS } });
    expect(justExpired.playsRemaining).toBe(MAX_FREE_PLAYS);
    expect(justExpired.canPlay).toBe(true);
  });

  it("treats a window that never opened as a fresh five", () => {
    expect(at({ playWindow: { used: 5, start: null } }).playsRemaining).toBe(MAX_FREE_PLAYS);
  });

  it("never grants the legacy trickle play on top of the window", () => {
    // The window IS the regeneration — a trickle play here is a sixth game.
    const state = at({
      playWindow: { used: 5, start: NOW - HOUR },
      lastRegenAt: null,
    });
    expect(state.regenPlayAvailable).toBe(false);
    expect(state.canPlay).toBe(false);
  });

  it("counts down to the window reset, not to a regen timer", () => {
    const state = at({ playWindow: { used: 5, start: NOW - HOUR } });
    expect(state.resetsAt).toBe(NOW - HOUR + WINDOW_MS);
    expect(state.timeUntilNextPlay).toBe("2h 0m");
  });

  it("ignores lifetime games played", () => {
    // The bug this rule replaced: five games FOR LIFE, because the count
    // came from games_played, which is never reset.
    expect(at({ gamesPlayed: 900 }).playsRemaining).toBe(MAX_FREE_PLAYS);
  });
});

describe("legacy rule", () => {
  const legacy = (overrides: Partial<PlayLimitInput> = {}) =>
    at({ windowMode: false, ...overrides });

  it("measures the five against lifetime games played", () => {
    expect(legacy({ gamesPlayed: 2 }).playsRemaining).toBe(3);
    expect(legacy({ gamesPlayed: 5 }).playsRemaining).toBe(0);
    expect(legacy({ gamesPlayed: 900 }).playsRemaining).toBe(0);
  });

  it("offers a trickle play once the five are gone and none was ever used", () => {
    const state = legacy({ gamesPlayed: 5, lastRegenAt: null });
    expect(state.regenPlayAvailable).toBe(true);
    expect(state.canPlay).toBe(true);
  });

  it("holds the trickle play back until the regen interval has passed", () => {
    const tooSoon = legacy({ gamesPlayed: 5, lastRegenAt: NOW - REGEN_MS + 1 });
    expect(tooSoon.regenPlayAvailable).toBe(false);
    expect(tooSoon.canPlay).toBe(false);

    const ready = legacy({ gamesPlayed: 5, lastRegenAt: NOW - REGEN_MS });
    expect(ready.regenPlayAvailable).toBe(true);
  });

  it("blocks a second trickle play immediately after one is spent", () => {
    // Guards the race between spending the play and the realtime update.
    const state = legacy({
      gamesPlayed: 5,
      lastRegenAt: NOW - REGEN_MS * 2,
      regenConsumedLocally: true,
    });
    expect(state.regenPlayAvailable).toBe(false);
    expect(state.canPlay).toBe(false);
  });

  it("does not offer a trickle play while free games remain", () => {
    expect(legacy({ gamesPlayed: 1, lastRegenAt: null }).regenPlayAvailable).toBe(false);
  });
});

describe("PRO members", () => {
  it("can always play, whatever the counters say", () => {
    const cases: Partial<PlayLimitInput>[] = [
      { playWindow: { used: 99, start: NOW } },
      { windowMode: false, gamesPlayed: 5000 },
      { windowMode: false, gamesPlayed: 5000, lastRegenAt: NOW },
    ];
    for (const overrides of cases) {
      expect(at({ isVip: true, ...overrides }).canPlay).toBe(true);
    }
  });

  it("never sees a countdown", () => {
    const state = at({ isVip: true, playWindow: { used: 5, start: NOW } });
    expect(state.timeUntilNextPlay).toBeNull();
  });

  it("never gets a trickle play, which would be meaningless", () => {
    expect(
      at({ isVip: true, windowMode: false, gamesPlayed: 5, lastRegenAt: null }).regenPlayAvailable
    ).toBe(false);
  });
});

describe("countdown label", () => {
  it("shows hours and minutes when over an hour remains", () => {
    expect(formatCountdown(2 * HOUR + 30 * MINUTE)).toBe("2h 30m");
    expect(formatCountdown(HOUR)).toBe("1h 0m");
  });

  it("drops the hours segment under an hour", () => {
    expect(formatCountdown(59 * MINUTE)).toBe("59m");
    expect(formatCountdown(30 * MINUTE)).toBe("30m");
  });

  it("never shows a negative time", () => {
    expect(formatCountdown(-HOUR)).toBe("0m");
    expect(formatCountdown(0)).toBe("0m");
  });

  it("is only shown when nothing is playable right now", () => {
    expect(at().timeUntilNextPlay).toBeNull();
    expect(at({ playWindow: { used: 3, start: NOW } }).timeUntilNextPlay).toBeNull();
    expect(at({ playWindow: { used: 5, start: NOW } }).timeUntilNextPlay).not.toBeNull();
  });
});

describe("isWindowExpired", () => {
  it("treats a missing window as expired", () => {
    expect(isWindowExpired(null, NOW)).toBe(true);
    expect(isWindowExpired({ used: 3, start: null }, NOW)).toBe(true);
  });

  it("expires exactly at the window length, matching consume_free_play()", () => {
    expect(isWindowExpired({ used: 3, start: NOW - WINDOW_MS + 1 }, NOW)).toBe(false);
    expect(isWindowExpired({ used: 3, start: NOW - WINDOW_MS }, NOW)).toBe(true);
  });
});

describe("spendPlayFromWindow", () => {
  it("opens a new window on the first play", () => {
    expect(spendPlayFromWindow(null, NOW)).toEqual({ used: 1, start: NOW });
  });

  it("increments inside a live window without moving its start", () => {
    const start = NOW - HOUR;
    expect(spendPlayFromWindow({ used: 2, start }, NOW)).toEqual({ used: 3, start });
  });

  it("restarts the window once the old one aged out", () => {
    expect(spendPlayFromWindow({ used: 5, start: NOW - WINDOW_MS }, NOW)).toEqual({
      used: 1,
      start: NOW,
    });
  });

  it("makes two fast taps cost two plays, not one", () => {
    // The optimistic update exists precisely to stop double-spending.
    const first = spendPlayFromWindow(null, NOW);
    const second = spendPlayFromWindow(first, NOW + 50);
    expect(second.used).toBe(2);
    expect(second.start).toBe(NOW);
  });

  it("never lets rapid taps exceed the quota within one window", () => {
    let window = spendPlayFromWindow(null, NOW);
    for (let i = 1; i < 5; i++) window = spendPlayFromWindow(window, NOW + i);
    expect(window.used).toBe(5);
    expect(resolvePlayLimit({ ...base, playWindow: window, now: NOW + 10 }).canPlay).toBe(false);
  });
});
