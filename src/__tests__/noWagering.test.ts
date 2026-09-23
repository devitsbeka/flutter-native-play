import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { REWARDS } from "@/config/rewardConfig";

/**
 * MyTrivia is a trivia game, not a casino.
 *
 * App Review rejected 1.0 (74) under the simulated-gambling rule: coins —
 * which gems buy, and gems are an in-app purchase — went into a game and came
 * out to whoever won it. An individual developer account can no longer ship
 * that at all, so every game is free to enter now, the house pays a good
 * result, and a bad one costs nothing (20261108100000_no_wagering.sql).
 *
 * These pin the parts a later change could quietly undo: the numbers the
 * screens print against the ones the database pays, the absence of any debit
 * in a settlement, the CI step that executes it, and the words.
 */

const REPO = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(REPO, p), "utf8");
const MIGRATION = "supabase/migrations/20261108100000_no_wagering.sql";

/** The body of one `CREATE OR REPLACE FUNCTION public.<name>` in a file. */
function fnBody(sql: string, name: string): string {
  const start = sql.indexOf(`FUNCTION public.${name}(`);
  expect(start, `${name} is defined in ${MIGRATION}`).toBeGreaterThan(-1);
  return sql.slice(start, sql.indexOf("$$;", start));
}

describe("no game is a wager", () => {
  const sql = read(MIGRATION);

  it("prints the amounts the database pays", () => {
    const quick = fnBody(sql, "settle_quick_game");
    expect(quick).toContain(`v_win     constant integer := ${REWARDS.GAME_WIN_REWARD};`);
    expect(quick).toContain(`v_draw    constant integer := ${REWARDS.GAME_DRAW_REWARD};`);

    const guess = fnBody(sql, "settle_guess_game");
    expect(guess).toContain(`v_win     constant integer := ${REWARDS.GUESS_WIN_REWARD};`);

    const [first, second, third] = REWARDS.ROOM_PLACE_PRIZES;
    const room = fnBody(sql, "settle_room_round");
    expect(room).toContain(`WHEN v_players = 2 THEN CASE WHEN g.p = 1 THEN ${first} ELSE 0 END`);
    expect(room).toContain(`WHEN 1 THEN ${first} WHEN 2 THEN ${second} WHEN 3 THEN ${third}`);
  });

  it("never takes a coin from a player in any settlement", () => {
    for (const name of ["settle_quick_game", "settle_guess_game", "settle_room_round"]) {
      const body = fnBody(sql, name);
      expect(body, `${name} subtracts from a balance`).not.toMatch(/coins\s*-\s*/);
      expect(body, `${name} writes a loss row`).not.toMatch(/'(stake_loss|room_stake)'\s*,\s*-/);
      expect(body, `${name} writes a negative grant`).not.toMatch(/VALUES\s*\([^)]*,\s*-v_/);
    }
  });

  it("leaves no reward to chance: the daily reward is a calendar", () => {
    const daily = fnBody(sql, "claim_daily_reward");
    expect(daily).not.toMatch(/random\s*\(/);
    for (const [i, r] of REWARDS.DAILY_REWARDS.entries()) {
      const power = r.powerUp ? `'${r.powerUp}'` : "NULL";
      expect(daily, `day ${i + 1}`).toMatch(
        new RegExp(`\\(${r.day},\\s*${r.coins},\\s*${r.gems},\\s*${power},\\s*${r.powerUpCount}\\)`),
      );
    }
  });

  it("rotates the level-up power-up instead of drawing it", () => {
    for (const f of ["src/components/game/MatchResultScreen.tsx", "src/pages/CategoryQuizPage.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("levelUpPowerUp(");
      expect(src, f).not.toMatch(/LEVEL_UP_POWER_UP_TYPES[^\n]*Math\.random|Math\.random[^\n]*powerUpTypes/);
    }
  });

  it("is the last word on the settlements and the daily reward", () => {
    // A later migration that redefines one of these would silently bring the
    // stake (or the roll) back. If one is needed, it must keep these rules — and update
    // this test to point at itself.
    const later = readdirSync(resolve(REPO, "supabase/migrations"))
      .filter((f) => f > "20261108100000_no_wagering.sql" && f.endsWith(".sql"));
    for (const f of later) {
      const body = read(`supabase/migrations/${f}`);
      expect(body, `${f} redefines a settlement`).not.toMatch(
        /FUNCTION\s+public\.(settle_quick_game|settle_guess_game|settle_room_round|claim_daily_reward)\s*\(/,
      );
    }
  });

  it("is executed in CI, and the wager suites are gone", () => {
    const ci = read(".github/workflows/pr-checks.yml");
    expect(ci).toContain("-f supabase/tests/26-no-wagering.sql");
    for (const retired of ["15-room-pot.sql", "21-guess-stake.sql", "23-honest-pot.sql"]) {
      expect(ci).not.toContain(retired);
    }
  });

  it("has no stake constants left for a screen to print", () => {
    const config = read("src/config/rewardConfig.ts");
    expect(config).not.toMatch(/\bGAME_STAKE\s*:/);
    expect(config).not.toMatch(/\bGUESS_STAKE\s*:/);
  });

  it("speaks every language the app does", () => {
    const keys = [
      "freeToPlay", "prizeLadder", "winnerEarns", "duelIntroHint", "leaveRoundBody", "newCategory",
    ];
    for (const lang of ["ka", "en", "de", "es", "fr", "it", "pt"]) {
      const file = read(`src/locales/${lang}.ts`);
      const block = file.slice(file.indexOf("playRewards: {"));
      expect(block.length, `${lang} has playRewards`).toBeGreaterThan(20);
      for (const k of keys) expect(block, `${lang}.playRewards.${k}`).toMatch(new RegExp(`\\b${k}: "`));
    }
  });
});
