import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SELF_ADVANCING_TV_PHASES, tvPhaseCanStall } from "@/hooks/useIdleTimeout";

const read = (p: string) => readFileSync(p, "utf8");
const ctx = read("src/contexts/TVGameContext.tsx");
const host = read("src/pages/TVHostController.tsx");
const poll = read("src/hooks/useTVPoll.ts");
const pollScreen = read("src/components/controller/ControllerPollScreen.tsx");

/**
 * An audit of the TV path for screens that wait for ever (owner: "check
 * whole path, TV mode should work perfectly without stops and issues").
 *
 * Four transitions have exactly one possible writer and no server backstop:
 * the countdown that starts a question, the round intro's "I'm ready", the
 * vote's end, and the end of the game. Each of them got one attempt, and a
 * refused or dropped write left the whole room on a screen that would never
 * move again.
 */
describe("the round intro waits for a human, so it is not timed out", () => {
  it("is off the self-advancing list — the host is the only one who can leave it", () => {
    expect(SELF_ADVANCING_TV_PHASES).not.toContain("round-intro");
    expect(tvPhaseCanStall("round-intro")).toBe(false);
    // The phases that really do move on their own stay on it.
    for (const phase of ["countdown", "question", "playing", "reveal"]) {
      expect(tvPhaseCanStall(phase), phase).toBe(true);
    }
  });
});

describe("the one-device transitions keep asking", () => {
  it("the countdown asks for 'playing' until the session leaves the countdown", () => {
    expect(host).toMatch(/if \(countdownValue !== 0 \|\| !isHost \|\| localPhase !== 'countdown'\) return;/);
    expect(host).toMatch(/const retry = setInterval\(fire, 2500\);/);
    // Not one shot behind a ref set before the call.
    expect(host).not.toMatch(/countdownValue === 0 && isHost && !hasTriggeredPlayingRef\.current/);
  });

  it("the vote's end asks until the phase moves", () => {
    expect(pollScreen).toMatch(/if \(pollPhase !== 'voting' \|\| timeRemaining !== 0 \|\| !isHost\) return;/);
    expect(pollScreen).toMatch(/const retry = setInterval\(\(\) => void ask\(\), 3000\);/);
    // A read that failed is not "you are not the host".
    expect(poll).toMatch(/if \(sessionCheckError\) \{[\s\S]*?\} else if \(sessionCheck\?\.host_user_id !== user\.id\) \{/);
  });

  it("the host is told when 'I'm ready' is refused, instead of it reading as a duplicate", () => {
    expect(ctx).toMatch(/if \(countdownError\) \{[\s\S]*?toast\.error\(t\('extra\.tvStartGameFailed'\)\);/);
  });
});

describe("the game ends on the row, and only because there is nothing left to play", () => {
  it("the end-game write is checked, and the host follows it rather than leading it", () => {
    expect(ctx).toMatch(/const endTheGame = async \(why: string\) => \{/);
    expect(ctx).toMatch(/if \(endError\) \{[\s\S]*?entry\.started = false; \/\/ let the watchdog try again/);
  });

  it("a round that could not be read is retried, and never mistaken for no rounds left", () => {
    expect(ctx).toMatch(/type QueueAdvanceResult = \{ started: boolean; reason\?: "no_more_rounds" \| "failed" \};/);
    expect(ctx).toMatch(/let outcome = await startNextRoundFromQueueIfAny\(\);\s*\n\s*if \(!outcome\.started && outcome\.reason === "failed"\) \{/);
    expect(ctx).toMatch(/return \{ started: false, reason: "no_more_rounds" \};/);
    expect(ctx).toMatch(/toast\.error\(t\('extra\.tvNextRoundFailed'\)\);\s*\n\s*\}\s*\n\s*await endTheGame\(outcome\.reason \?\? 'no more queue'\);/);
  });
});

describe("a host that missed the round the session started catches up", () => {
  it("from a question, a reveal, the results, the picker or any poll screen", () => {
    expect(ctx).toMatch(/const sessionStartedARound = dbPhase === 'round-intro' \|\| dbPhase === 'countdown';/);
    expect(ctx).toMatch(/s\.phase\.startsWith\('poll-'\);/);
    expect(ctx).toMatch(/if \(isHostRef\.current && sessionStartedARound && stillOnTheOldScreen\) \{/);
  });
});

describe("nobody is left holding a session they cannot write to", () => {
  it("claiming the session as host is checked, and a refusal is not a host", () => {
    expect(ctx).toMatch(/const \{ data: claimed, error: claimError \} = await supabase/);
    expect(ctx).toMatch(/if \(claimError \|\| !claimed\?\.length\) \{[\s\S]*?return false;/);
  });

  it("a winning round with nothing to ask leaves the queue instead of being offered again", () => {
    expect(poll).toMatch(/const deadRow = \(insertedQueue \?\? \[\]\)\.find\(row => row\.position === 0\);/);
    expect(poll).toMatch(/if \(deadRow\) await supabase\.from\('tv_session_queue'\)\.delete\(\)\.eq\('id', deadRow\.id\);/);
  });
});
