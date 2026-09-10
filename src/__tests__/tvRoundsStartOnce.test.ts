import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(p, "utf8");
const ctx = read("src/contexts/TVGameContext.tsx");
const host = read("src/pages/TVHostController.tsx");

/**
 * The host queued three rounds on TV. Start "did not start the first round
 * and that round just disappeared"; the second played; on the third "only
 * host could see first question, tv show round category and other players
 * see loading, waiting for host" (owner).
 *
 * Two defects. Start deleted the first queue row BEFORE it fetched a single
 * question, so any early return (no questions in the player's language, an
 * unresolvable category, a rejected write) lost the round — and the phone
 * deleted queue[0] again whatever startGame had answered. And the queued-
 * round advance had no guard on its automatic path and no CAS on its write,
 * so a late duplicate wrote 'round-intro' over a round already in play; the
 * host's phone rightly refused a backward phase, its self-heal had no rank
 * for 'round-intro', and "I'm ready" lives on a screen it was not drawing.
 */
describe("a queued round leaves the queue only once the session has started it", () => {
  it("startGame consumes the row after the successful write, not before the question fetch", () => {
    expect(ctx).toMatch(/async function consumeTvQueueItem\(sessionId: string, itemId: string\): Promise<void> \{/);
    expect(ctx).toMatch(/let queueItemToConsume: string \| null = null;/);
    expect(ctx).toMatch(/queueItemToConsume = String\(first\.id\);\s*\n\s*queueCount = Math\.max\(0, queueCount - 1\);/);
    expect(ctx).toMatch(/if \(queueItemToConsume\) await consumeTvQueueItem\(state\.sessionId, queueItemToConsume\);\s*\n\s*\n\s*tvLogPhase\('lobby', 'countdown', 'startGame'\);/);
    // The pre-fetch delete is gone: the only by-row tv_session_queue delete
    // in the file is the helper's (the game-over screen clears the whole
    // queue by session for a fresh selection, which is a different thing).
    expect(ctx.match(/from\('tv_session_queue'\)\.delete\(\)\.eq\('id'/g) ?? []).toHaveLength(1);
    expect(ctx).not.toMatch(/from\('tv_session_queue'\)\s*\n\s*\.delete\(\)\s*\n\s*\.eq\('id'/);
  });

  it("the phone removes only the row it started, and only when it started", () => {
    expect(host).toMatch(/started = await startGame\(undefined, firstQueueItem\.userTriviaId\);/);
    expect(host).toMatch(/started = await startGame\(firstQueueItem\.categoryId\);/);
    expect(host).toMatch(/if \(started && queue\.length > 0\) \{/);
    expect(host).toMatch(/if \(isTheStartedRound && !firstQueued\.id\.startsWith\('initial-'\)\) \{/);
    expect(host).toMatch(/if \(started && !firstQueued\.id\.startsWith\('initial-'\)\) \{/);
    expect(host).not.toMatch(/\n\s+await startGame\(firstQueueItem/);
  });
});

describe("the next round is advanced once, from a round that can be left", () => {
  it("one advance in flight, whoever asked; a duplicate is 'started', not 'ended'", () => {
    expect(ctx).toMatch(/const queueAdvanceInFlightRef = useRef\(false\);/);
    expect(ctx).toMatch(/const advanceToNextQueuedRound = useCallback\(async \(\) => \{\s*\n\s*if \(!isHost\) return false;/);
    expect(ctx).toMatch(/const startNextRoundFromQueueIfAny = useCallback\(async \(\) => \{\s*\n\s*if \(queueAdvanceInFlightRef\.current\) \{[\s\S]*?return true;\s*\n\s*\}\s*\n\s*queueAdvanceInFlightRef\.current = true;\s*\n\s*try \{\s*\n\s*return await advanceToNextQueuedRound\(\);\s*\n\s*\} finally \{\s*\n\s*queueAdvanceInFlightRef\.current = false;/);
  });

  it("the round number rides the same write as the status, behind a CAS on the phase being left", () => {
    expect(ctx).toMatch(/status: 'round-intro',[\s\S]*?round_number: newRoundNumber,[\s\S]*?\.eq\('id', state\.sessionId\)\s*\n\s*\.in\('status', \['reveal', 'results', 'completed'\]\)\s*\n\s*\.select\('id'\);/);
    expect(ctx).not.toMatch(/\.update\(\{ round_number: newRoundNumber \}\)/);
    // The overflow guard runs BEFORE the write, so nothing is consumed for a
    // round that cannot exist.
    const guard = ctx.indexOf("tvLog('Prevented round overflow'");
    const write = ctx.indexOf("const { data: advancedRows, error: updateError }");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(write);
    // A write that matched nothing answers by what the session is doing now.
    expect(ctx).toMatch(/const live = \['round-intro', 'countdown', 'playing', 'question'\]\.includes\(now\?\.status \?\? ''\);/);
    expect(ctx).toMatch(/return live;/);
  });

  it("the host's own state follows the write before the queue tidy-up", () => {
    const state = ctx.indexOf("// The host's own state follows the write at once");
    const consume = ctx.indexOf("await consumeTvQueueItem(state.sessionId, String(nextItem.id));");
    expect(state).toBeGreaterThan(0);
    expect(state).toBeLessThan(consume);
    expect(ctx).toMatch(/tvLogError\('startNextRoundFromQueueIfAny room queue', err\);/);
  });
});

describe("a host left behind between rounds catches up", () => {
  it("the sync poll resyncs a host still on a question while the session is in intro or countdown", () => {
    expect(ctx).toMatch(/isHostRef\.current &&\s*\n\s*\(dbPhase === 'round-intro' \|\| dbPhase === 'countdown'\) &&\s*\n\s*\(s\.phase === 'question' \|\| s\.phase === 'reveal'\)\s*\n\s*\) \{[\s\S]*?refetchSessionData\(s\.sessionId\);\s*\n\s*return;/);
  });

  it("and the refetch applies an intro at question 0 even with a stale round number", () => {
    expect(ctx).toMatch(/fetchedRound <= prevRound &&[\s\S]*?\['playing', 'question', 'reveal'\]\.includes\(session\.status\)\s*\n\s*\) \{/);
  });
});
