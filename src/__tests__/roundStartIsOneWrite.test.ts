/**
 * A round starts once, and a player who comes back mid-round comes back
 * where they were.
 *
 * Two players were thrown out of a live round and found themselves back at
 * its start (owner: "during the game we have experience we were kicked out
 * from game and we came back check why"). Two things in the start path
 * could do that, and both are closed here.
 *
 * ONE: two starts. Any player may start a round — the host's Start, another
 * seat's "Play again", a queue advancing — and nothing stopped two of them
 * landing together. Each made its own room_games row and questions and
 * then wrote the room, and the second write changed current_game_id under
 * every client mid-round: isNewGameWhilePlaying fired on all of them, and
 * the table was pulled out of question three and into question one of the
 * other round. The room write is a compare-and-swap on the round now.
 *
 * TWO: the rejoin. A reconnect — the phone slept, the webview reloaded —
 * re-enters through the initial sync, which reset the player's own row to
 * question 0 and score 0 and replayed the round from the top. It resumes
 * from the row now.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ctx = readFileSync(join(process.cwd(), "src/contexts/MultiplayerContextV2.tsx"), "utf8");

describe("one write starts a round", () => {
  it("every start path claims the room rather than overwriting it", () => {
    // Six paths begin a round (roundStartStamp.test.ts counts them too):
    // startGame, saveQuestionsAndStartGame, startNewRound's two branches,
    // startNextFromQueue's two. The race is ACROSS them — the host's Start
    // against another seat's "Play again" — so one unclaimed path would be
    // the whole hole.
    const claims = ctx.match(/if \(!\(await claimRoundStart\(roomId, /g) ?? [];
    expect(claims).toHaveLength(6);
    // No bare status flip is left anywhere: every "playing" write of the
    // room row goes through the claim.
    const bare = ctx.match(/\.from\("game_rooms"\)\s*\n\s*\.update\(\{[^}]*status: "playing"/g) ?? [];
    expect(bare).toHaveLength(0);
  });

  it("on the round, not the status — a host may start N+1 while N is still being finished", () => {
    const fn = ctx.slice(ctx.indexOf("const claimRoundStart = useCallback"), ctx.indexOf("const stampRoomStarted"));
    expect(fn).toMatch(/claim = priorGameId \? claim\.eq\("current_game_id", priorGameId\) : claim\.is\("current_game_id", null\);/);
    expect(fn).not.toMatch(/\.eq\("status"/);
    expect(fn).not.toMatch(/\.neq\("status"/);
  });

  it("and reads the round it will compare against before the writes, not after them", () => {
    // startGame has freshRoom from its top; saveQuestionsAndStartGame reads
    // one line in, before the deletes, the game row and the questions —
    // seconds in which two starts can both believe they are next.
    expect(ctx).toMatch(/claimRoundStart\(roomId, freshRoom\.current_game_id, \{/);
    const save = ctx.slice(ctx.indexOf("const saveQuestionsAndStartGame = useCallback"), ctx.indexOf("const submitAnswer = useCallback"));
    const read = save.indexOf('.select("current_game_id")');
    const del = save.indexOf("safeDeleteRoomQuestions(roomId)");
    const insert = save.indexOf('.from("room_games")');
    expect(read).toBeGreaterThan(-1);
    expect(read).toBeLessThan(del);
    expect(read).toBeLessThan(insert);
    expect(save).toMatch(/claimRoundStart\(roomId, priorGameId, \{/);
  });

  it("the loser stands down quietly — the winner's round is the one that arrives", () => {
    const fn = ctx.slice(ctx.indexOf("const claimRoundStart = useCallback"), ctx.indexOf("const stampRoomStarted"));
    expect(fn).toMatch(/if \(!won \|\| won\.length === 0\) \{\s*\n\s*console\.warn\(/);
    // A write ERROR is still spoken: that one is a failure, not a race.
    expect(fn).toMatch(/if \(error\) \{[\s\S]*?toast\.error\(tStandalone\("extra\.mpGameStartFailed"\)\);/);
  });
});

describe("a rejoin resumes", () => {
  const sync = ctx.slice(ctx.indexOf("Subscription connected, room already playing"), ctx.indexOf("Initial sync: failed to fetch questions"));

  it("reads the player's own row before touching it", () => {
    expect(sync).toMatch(/\.select\("status, current_question, score"\)\s*\n\s*\.eq\("room_id", roomId\)\s*\n\s*\.eq\("user_id", user\.id\)/);
  });

  it("and treats a 'playing' row past question 0 and short of the end as this round's progress", () => {
    // reset_room_participants zeroes every row when a round STARTS, so such
    // a row was advanced in this round, by this player. A row at 0, or one
    // that finished, is reset as before.
    expect(sync).toMatch(/if \(mine\?\.status === "playing" && at > 0 && \(expectedTotal <= 0 \|\| at < expectedTotal\)\) \{/);
    expect(sync).toMatch(/if \(user\?\.id && !resumeAt\) \{\s*\n\s*await supabase\s*\n\s*\.from\("room_participants"\)\s*\n\s*\.update\(\{ score: 0, current_question: 0, status: "playing" \}\)/);
  });

  it("landing on that question with that score, never past the last one", () => {
    expect(sync).toMatch(/currentQuestionIndex: resumeAt \? Math\.min\(resumeAt\.question, questions\.length - 1\) : 0,/);
    expect(sync).toMatch(/myScore: resumeAt \? resumeAt\.score : 0,/);
  });

  it("and the reset that zeroes every row at a start is still the host's, server-side", () => {
    // What makes "playing and past 0" mean THIS round: the RPC exists and
    // is called on every start path.
    expect(ctx).toMatch(/"reset_room_participants"/);
    expect((ctx.match(/await resetAllParticipants\(roomId\)|resetAllParticipants\(roomId\),/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
