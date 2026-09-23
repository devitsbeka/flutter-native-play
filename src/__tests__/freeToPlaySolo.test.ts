/**
 * Solo games are free: the quick game, the Guess card and the duel.
 *
 * A quick game used to cost 500 to lose and pay 500 to win; the Guess card
 * staked 200 against Trivia King. Coins come from gems and gems are an
 * in-app purchase, so a game you paid coins into and could lose them from
 * was a wager — App Review rejected 1.0 (74) under the simulated-gambling
 * rule. Now nothing is staked (20261108100000_no_wagering):
 *
 *   quick game  win +200, draw +50, lose nothing
 *   Guess card  beat Trivia King +100, lose nothing
 *
 * No balance is asked for at any door, no screen prints a price or a loss,
 * and the client can only ever credit. The room half is in noWagering and
 * the room tests; the SQL is executed in supabase/tests/26-no-wagering.sql
 * and 02-assertions.sql.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REWARDS } from "@/config/rewardConfig";
import { GAME_MODE_META } from "@/config/gameModeMeta";
import { resolveGameSettlement } from "@/utils/gameStake";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const create = read("src/components/team/CreateRoomPage.tsx");
const level = read("src/pages/CategoryQuizPage.tsx");
const hook = read("src/hooks/useGameStake.ts");
const migration = read("supabase/migrations/20261108100000_no_wagering.sql");

describe("the numbers", () => {
  it("the client and the settlement functions pay the same rewards", () => {
    expect(REWARDS.GAME_WIN_REWARD).toBe(200);
    expect(REWARDS.GAME_DRAW_REWARD).toBe(50);
    expect(REWARDS.GUESS_WIN_REWARD).toBe(100);
    expect(migration).toContain(`v_win     constant integer := ${REWARDS.GAME_WIN_REWARD};`);
    expect(migration).toContain(`v_draw    constant integer := ${REWARDS.GAME_DRAW_REWARD};`);
    expect(migration).toContain(`v_win     constant integer := ${REWARDS.GUESS_WIN_REWARD};`);
    for (const gone of ["GAME_STAKE", "GUESS_STAKE", "GAME_DRAW_REFUND", "GAME_LOSE_REWARD"]) {
      expect(REWARDS, gone).not.toHaveProperty(gone);
    }
  });

  it("the result screen's expectation pays and never takes", () => {
    expect(resolveGameSettlement({ outcome: "win" })).toEqual({ credit: 200, delta: 200 });
    expect(resolveGameSettlement({ outcome: "draw" })).toEqual({ credit: 50, delta: 50 });
    expect(resolveGameSettlement({ outcome: "lose" })).toEqual({ credit: 0, delta: 0 });
  });

  it("every mode card says Free; My Trivias says nothing", () => {
    for (const [mode, meta] of Object.entries(GAME_MODE_META)) {
      expect(meta.price, mode).toBe(mode === "mytrivias" ? null : 0);
    }
  });
});

describe("no door asks for a balance", () => {
  it("the stake modal is gone, and nothing opens it", () => {
    expect(existsSync(join(process.cwd(), "src/components/home/NotEnoughStakeModal.tsx"))).toBe(false);
    for (const file of [
      "src/pages/Index.tsx",
      "src/pages/Game.tsx",
      "src/components/team/CreateRoomPage.tsx",
      "src/components/game/MatchResultScreen.tsx",
    ]) {
      const src = read(file);
      expect(src, file).not.toMatch(/NotEnoughStakeModal|hasEnoughCoins|GAME_STAKE|GUESS_STAKE/);
    }
  });

  it("the Guess pick goes straight to the round, flagged as a Guess run", () => {
    expect(create).not.toMatch(/coins < REWARDS/);
    expect(create).toMatch(/handoff\(`\/play\/\$\{cat\.category_id \?\? cat\.id\}\/\$\{level\}`, \{ state: \{ countdown: true, guessStake: true, versus: true \} \}\);/);
  });
});

describe("the hook only credits", () => {
  it("has no debit path, on the server call or the fallback", () => {
    expect(hook).not.toMatch(/spendCoins|canAffordCoins|stakeAmount|netLoss|Math\.min/);
    expect(hook).toMatch(/client\.rpc\("settle_quick_game", \{\s*\n\s*p_outcome: outcome,\s*\n\s*p_reference: matchId \|\| null,\s*\n\s*\}\)/);
    expect(hook).toMatch(/client\.rpc\("settle_guess_game", \{\s*\n\s*p_outcome: outcome,\s*\n\s*p_reference: runId,\s*\n\s*\}\)/);
    // Where the function has not reached a project, a win is paid the old
    // way; a loss is nothing either way.
    expect(hook).toMatch(/error\.code === "PGRST202" \|\| \/settle_guess_game\/i\.test\(error\.message\)/);
    expect(hook).toMatch(/addCoins\(REWARDS\.GUESS_WIN_REWARD, "stake_win"\)/);
  });
});

describe("the Guess run", () => {
  it("settles once, by score against the King, and the dead stake line is gone", () => {
    expect(level).toMatch(/const guessRunId = useRef<string>\(mintRunId\(\)\);/);
    expect(level).toMatch(/if \(guessStake\) \{\s*\n\s*const applied = await settleGuessGame\(duelOutcome\(duelPoints, mascotScore\), guessRunId\.current\);\s*\n\s*setGuessDelta\(applied\);/);
    expect(level).not.toMatch(/quizStakeWon|quizStakeLost/);
  });
});

describe("the card", () => {
  it("says Free where a price would be, with no coin, for a mode priced 0", () => {
    expect(create).toMatch(/\{price !== null && !busy && \(/);
    expect(create).toMatch(/\{price > 0 && \(\s*\n\s*<img alt="" src=\{coinIcon\}/);
    expect(create).toMatch(/\{price === 0 \? t\("discover\.free"\) : formatCompactNumber\(price\)\}/);
  });

  it("sets the word bold, and strokes it in Georgian, where Slackey's weight is not on offer", () => {
    // (owner: "show 'free' 'უფასო' as bold font on label").
    expect(create).toMatch(/bg-clip-text font-hero font-bold text-\[calc\(22\*var\(--u\)\)\]/);
    expect(create).toMatch(/price === 0 && \/\[\\u10A0-\\u10FF\]\/\.test\(t\("discover\.free"\)\) && "\[-webkit-text-stroke:0\.6px_#6b4a1a\]"/);
    expect(read("src/locales/ka.ts")).toMatch(/\n\s+free: "უფასო",/);
  });

  it("the two blurbs fit their two lines, in all seven, and the Georgian is the owner's", () => {
    const ka = read("src/locales/ka.ts");
    expect(ka).toMatch(/modeGuessDesc: "გამოიცანი ლოგო, დროშა, ქალაქი და სხვა",/);
    expect(ka).toMatch(/modeWordsDesc: "შეაერთე ასოები და ააწყვე სიტყვები\.",/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["modeGuessDesc", "modeWordsDesc"]) {
        const m = src.match(new RegExp(`\\n\\s+${key}: "([^"]+)",`));
        expect(m, `${lang}.${key}`).not.toBeNull();
        // Two lines of the 18px blurb hold about 60 Latin characters.
        expect(m![1].length, `${lang}.${key}`).toBeLessThanOrEqual(60);
      }
    }
  });
});

describe("what a subscription still buys", () => {
  it("the welcome bundle and the rest of PRO, untouched", () => {
    expect(REWARDS.PRO_WELCOME.pro).toEqual({ coins: 25000, gems: 10 });
    expect(REWARDS.PRO_WELCOME.pro_plus).toEqual({ coins: 50000, gems: 20 });
    const vip = read("src/utils/vipMultipliers.ts");
    expect(vip).toMatch(/export function calculateXP/);
    expect(vip).toMatch(/export function getVipDailyPowerUps/);
  });
});
