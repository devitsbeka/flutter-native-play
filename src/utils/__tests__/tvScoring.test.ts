import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { installMemoryLocalStorage } from "@/test/memoryLocalStorage";
import {
  calculateTimeRemaining,
  clearExpiredBindings,
  getQuestionTime,
  getSessionBinding,
  setSessionBinding,
} from "@/utils/tvScoring";
import { QUESTION_TIME_SECONDS, calculatePoints } from "@/utils/scoring";

const NOW = new Date("2026-08-10T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;

beforeEach(() => {
  installMemoryLocalStorage();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const isoAgo = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe("calculateTimeRemaining", () => {
  it("gives the full clock before a question has started", () => {
    expect(calculateTimeRemaining(null)).toBe(QUESTION_TIME_SECONDS);
    expect(calculateTimeRemaining(undefined)).toBe(QUESTION_TIME_SECONDS);
  });

  it("counts down from the server's start time", () => {
    expect(calculateTimeRemaining(isoAgo(0))).toBe(QUESTION_TIME_SECONDS);
    expect(calculateTimeRemaining(isoAgo(5_000))).toBe(QUESTION_TIME_SECONDS - 5);
    expect(calculateTimeRemaining(isoAgo(14_000))).toBe(QUESTION_TIME_SECONDS - 14);
  });

  it("floors at zero once the question has expired", () => {
    expect(calculateTimeRemaining(isoAgo(QUESTION_TIME_SECONDS * 1000))).toBe(0);
    expect(calculateTimeRemaining(isoAgo(60_000))).toBe(0);
  });

  it("never exceeds the question length when clocks disagree", () => {
    // A phone whose clock is behind the server would otherwise be handed
    // more time than the question allows — free points.
    expect(calculateTimeRemaining(new Date(NOW.getTime() + 30_000).toISOString())).toBe(
      QUESTION_TIME_SECONDS
    );
  });

  it("honours a custom question length", () => {
    expect(calculateTimeRemaining(isoAgo(5_000), 30)).toBe(25);
    expect(calculateTimeRemaining(isoAgo(40_000), 30)).toBe(0);
  });

  it("stays inside 0..total for any offset", () => {
    for (const offset of [-60_000, -1, 0, 1, 7_500, 15_000, 999_999]) {
      const remaining = calculateTimeRemaining(new Date(NOW.getTime() - offset).toISOString());
      expect(remaining, `offset ${offset}`).toBeGreaterThanOrEqual(0);
      expect(remaining, `offset ${offset}`).toBeLessThanOrEqual(QUESTION_TIME_SECONDS);
    }
  });

  it("feeds the shared scoring formula, so TV pays the same as every mode", () => {
    const remaining = calculateTimeRemaining(isoAgo(5_000));
    expect(calculatePoints(true, remaining)).toBe(calculatePoints(true, QUESTION_TIME_SECONDS - 5));
  });
});

describe("getQuestionTime", () => {
  it("reports the shared question length", () => {
    expect(getQuestionTime()).toBe(QUESTION_TIME_SECONDS);
  });
});

describe("session bindings", () => {
  it("returns null when a session has never been joined", () => {
    expect(getSessionBinding("ABCD")).toBeNull();
  });

  it("returns the same player id on a rejoin, so joining is idempotent", () => {
    setSessionBinding("ABCD", "player-1");
    expect(getSessionBinding("ABCD")).toBe("player-1");
    expect(getSessionBinding("ABCD")).toBe("player-1");
  });

  it("keeps sessions separate", () => {
    setSessionBinding("ABCD", "player-1");
    setSessionBinding("WXYZ", "player-2");
    expect(getSessionBinding("ABCD")).toBe("player-1");
    expect(getSessionBinding("WXYZ")).toBe("player-2");
  });

  it("holds a binding for just under 24 hours", () => {
    setSessionBinding("ABCD", "player-1");
    vi.setSystemTime(new Date(NOW.getTime() + 24 * HOUR_MS - 1));
    expect(getSessionBinding("ABCD")).toBe("player-1");
  });

  it("expires a binding past 24 hours and forgets it", () => {
    setSessionBinding("ABCD", "player-1");
    vi.setSystemTime(new Date(NOW.getTime() + 24 * HOUR_MS + 1));

    expect(getSessionBinding("ABCD")).toBeNull();
    // Reading an expired binding also cleans it up.
    expect(localStorage.getItem("tv_session_binding_ABCD")).toBeNull();
  });

  it("survives corrupted storage instead of throwing", () => {
    // A half-written or hand-edited value must not break joining a game.
    localStorage.setItem("tv_session_binding_ABCD", "{not json");
    expect(getSessionBinding("ABCD")).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem() {
          throw new Error("SecurityError: storage disabled");
        },
        setItem() {
          throw new Error("QuotaExceededError");
        },
      },
      configurable: true,
    });

    expect(() => setSessionBinding("ABCD", "player-1")).not.toThrow();
    expect(getSessionBinding("ABCD")).toBeNull();
  });
});

describe("clearExpiredBindings", () => {
  it("removes only the expired bindings", () => {
    setSessionBinding("OLD1", "player-old");
    vi.setSystemTime(new Date(NOW.getTime() + 25 * HOUR_MS));
    setSessionBinding("NEW1", "player-new");

    clearExpiredBindings();

    expect(localStorage.getItem("tv_session_binding_OLD1")).toBeNull();
    expect(getSessionBinding("NEW1")).toBe("player-new");
  });

  it("leaves unrelated keys alone", () => {
    localStorage.setItem("preferredLanguage", "ka");
    localStorage.setItem("scene_pref_user1", "default");
    setSessionBinding("OLD1", "player-old");
    vi.setSystemTime(new Date(NOW.getTime() + 25 * HOUR_MS));

    clearExpiredBindings();

    expect(localStorage.getItem("preferredLanguage")).toBe("ka");
    expect(localStorage.getItem("scene_pref_user1")).toBe("default");
  });

  it("clears several expired bindings in one pass", () => {
    // Removing while walking by index is the classic way to skip entries;
    // this fails if the implementation mutates mid-iteration.
    for (const code of ["A1", "B2", "C3", "D4"]) setSessionBinding(code, `p-${code}`);
    vi.setSystemTime(new Date(NOW.getTime() + 25 * HOUR_MS));

    clearExpiredBindings();

    for (const code of ["A1", "B2", "C3", "D4"]) {
      expect(localStorage.getItem(`tv_session_binding_${code}`), code).toBeNull();
    }
  });

  it("does nothing when there is nothing to clear", () => {
    setSessionBinding("FRESH", "player-1");
    expect(() => clearExpiredBindings()).not.toThrow();
    expect(getSessionBinding("FRESH")).toBe("player-1");
  });
});
