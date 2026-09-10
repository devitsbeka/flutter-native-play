/**
 * The Guess card: 200 to play, +200 on a pass, -200 on a fail; Words free.
 *
 * The chooser said every game cost 500. Two of them did not: a Guess pick
 * sends the player into the category's own level, which has never had a
 * stake, and Words charges nothing but its hints. The owner's rules
 * (owner: "guess game cost should be 200 instead 500, player plays solo and
 * wins +200 if wins, -200 if looses ... make words free game, say free
 * instead coins ... my trivia option it's free but we don't have to show it
 * at all"):
 *
 *   Guess       200, settled by settle_guess_game, the quick game's function
 *               at 200 under the same ledger kinds and daily ceiling.
 *   Words       0 — the badge says "Free".
 *   My Trivias  null — no badge.
 *
 * And the two blurbs fit their two lines without an ellipsis.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REWARDS } from "@/config/rewardConfig";
import { GAME_MODE_META } from "@/config/gameModeMeta";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const create = read("src/components/team/CreateRoomPage.tsx");
const level = read("src/pages/CategoryQuizPage.tsx");
const hook = read("src/hooks/useGameStake.ts");
const migration = read("supabase/migrations/20261105100000_settle_guess_game.sql");

describe("the numbers", () => {
  it("200 for a guess, free words, silent my-trivias", () => {
    expect(REWARDS.GUESS_STAKE).toBe(200);
    expect(GAME_MODE_META.guess.price).toBe(200);
    expect(GAME_MODE_META.words.price).toBe(0);
    expect(GAME_MODE_META.mytrivias.price).toBeNull();
  });

  it("the migration charges the same 200 the card prints, and nobody anonymous can call it", () => {
    expect(migration).toContain(`v_stake   constant integer := ${REWARDS.GUESS_STAKE};`);
    expect(migration).toMatch(/kind IN \('stake_win', 'stake_loss'\)/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.settle_guess_game\(text, text\) FROM PUBLIC, anon;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.settle_guess_game\(text, text\) TO authenticated;/);
    expect(read(".github/workflows/pr-checks.yml")).toContain("supabase/tests/21-guess-stake.sql");
    expect(read("src/integrations/supabase/types.ts")).toMatch(/settle_guess_game: \{\s*\n\s*Args: \{ p_outcome: string; p_reference\?: string \}/);
  });
});

describe("the card", () => {
  it("says Free where a price would be, with no coin, for a mode priced 0", () => {
    expect(create).toMatch(/\{price !== null && !busy && \(/);
    expect(create).toMatch(/\{price > 0 && \(\s*\n\s*<img alt="" src=\{coinIcon\}/);
    expect(create).toMatch(/\{price === 0 \? t\("discover\.free"\) : formatCompactNumber\(price\)\}/);
  });

  it("sets the word bold, and strokes it in Georgian, where Slackey's weight is not on offer", () => {
    // (owner: "show 'free' 'უფასო' as bold font on label"). Google Sans'
    // Georgian is one 700 face, so the bold alone is what the title already
    // gets; the stroke is what makes it read as heavy as the Slackey "1-2"
    // beside it — and would over-thicken Slackey, so Latin "Free" is spared.
    expect(create).toMatch(/bg-clip-text font-hero font-bold text-\[calc\(22\*var\(--u\)\)\]/);
    expect(create).toMatch(/price === 0 && \/\[\\u10A0-\\u10FF\]\/\.test\(t\("discover\.free"\)\) && "\[-webkit-text-stroke:0\.6px_#6b4a1a\]"/);
    expect(read("src/locales/ka.ts")).toMatch(/\n\s+free: "უფასო",/);
  });

  it("checks the guess stake at the door and flags the level as staked", () => {
    expect(create).toMatch(/if \(coins < REWARDS\.GUESS_STAKE\) \{\s*\n\s*setShowGuessStake\(true\);\s*\n\s*return;/);
    expect(create).toMatch(/state: \{ countdown: true, guessStake: true, versus: true \}/);
    expect(create).toMatch(/<NotEnoughStakeModal isOpen=\{showGuessStake\} onClose=\{\(\) => setShowGuessStake\(false\)\} stake=\{REWARDS\.GUESS_STAKE\} \/>/);
    expect(read("src/components/home/NotEnoughStakeModal.tsx")).toMatch(/const stakeAmount = stake \?\? quickStake;/);
  });
});

describe("the level", () => {
  it("settles a staked run once, by score against the King, and shows what moved", () => {
    expect(level).toMatch(/const duelFromState = Boolean\(\(location\.state as \{ guessStake\?: boolean \} \| null\)\?\.guessStake\);/);
    expect(level).toMatch(/const guessStake = duelFromState;/);
    expect(level).toMatch(/const guessRunId = useRef<string>\(mintRunId\(\)\);/);
    // Was `result.stars >= 1 ? "win" : "lose"` — a pass. Now the match is
    // against Trivia King and the score decides it; see guessDuel.
    expect(level).toMatch(/if \(guessStake\) \{\s*\n\s*const applied = await settleGuessGame\(duelOutcome\(score, mascotScore\), guessRunId\.current\);\s*\n\s*setGuessDelta\(applied\);/);
    expect(level).toMatch(/\{guessStake && !isSaving && guessDelta !== null && guessDelta !== 0 && \(/);
    expect(level).toMatch(/t\("extra\.quizStakeWon"\)/);
    expect(level).toMatch(/t\("extra\.quizStakeLost"\)/);
  });

  it("the hook names the outcome and the run, never the amount, and falls back at 200 only when the function is missing", () => {
    expect(hook).toMatch(/client\.rpc\("settle_guess_game", \{\s*\n\s*p_outcome: outcome,\s*\n\s*p_reference: runId,\s*\n\s*\}\)/);
    expect(hook).toMatch(/error\.code === "PGRST202" \|\| \/settle_guess_game\/i\.test\(error\.message\)/);
    expect(hook).toMatch(/addCoins\(REWARDS\.GUESS_STAKE, "stake_win"\)/);
    expect(hook).toMatch(/Math\.min\(REWARDS\.GUESS_STAKE, Math\.max\(0, Math\.floor\(coins\)\)\)/);
  });
});

describe("the words", () => {
  it("are short enough for two lines, in all seven, and the Georgian is the owner's", () => {
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
      for (const key of ["quizStakeWon", "quizStakeLost"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "[^"]+",`));
      }
    }
  });
});
