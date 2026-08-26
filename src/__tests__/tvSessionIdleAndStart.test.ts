import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tvPhaseCanStall, SELF_ADVANCING_TV_PHASES } from "@/hooks/useIdleTimeout";

/**
 * "I can't click Start, it kicks me out and I see a white sign-in screen."
 *
 * Three faults behind one report, and each is enough on its own.
 *
 * 1. The host was ejected after sixty seconds in the lobby. useIdleTimeout
 *    fires when the watched value has not changed for a minute, and the
 *    watched value is the TV phase. In `lobby` the phase does not change —
 *    the host is holding a QR code up to the room and building a round
 *    queue, which is the screen doing its job. One minute in, leaveSession()
 *    and navigate('/team'), mid-setup.
 *
 * 2. /team then rendered "Sign in to play with friends" at a signed-in host.
 *    The guard is `if (!user)`, and `user` is null while auth restores the
 *    session. authLoading was already read by the effects; the render was
 *    the one place that ignored it.
 *
 * 3. startGame returned silently when the context had not joined the session
 *    yet. The button guards on the sessionId in the URL, startGame on the
 *    one the context sets after joining; in the gap a press did nothing at
 *    all — no toast, no log — which looks exactly like a broken button.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** Source with comments stripped: a rule about code must not be satisfied,
 *  or broken, by prose describing the code. */
const codeOf = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("which phases may be called stalled", () => {
  it("times the phases that advance on their own", () => {
    for (const phase of ["countdown", "question", "playing", "reveal", "round-intro"]) {
      expect(tvPhaseCanStall(phase), phase).toBe(true);
    }
  });

  it("never times a phase that is waiting for a person", () => {
    // The lobby is the one from the report. The rest are the same shape:
    // nothing moves until a human does something.
    for (const phase of [
      "lobby", "pairing", "waiting", "category-select",
      "poll-suggest", "poll-voting", "poll-results",
      "results", "completed", "idle",
    ]) {
      expect(tvPhaseCanStall(phase), phase).toBe(false);
    }
  });

  it("is an allowlist, so a new phase is not ejected by default", () => {
    // Failing towards "a screen you can back out of" beats failing towards
    // "thrown off a screen you were using".
    expect(tvPhaseCanStall("some-phase-added-next-year")).toBe(false);
    expect(SELF_ADVANCING_TV_PHASES).not.toContain("lobby");
  });
});

describe("the idle timeout hook", () => {
  const hook = read("src/hooks/useIdleTimeout.ts");

  it("can be switched off", () => {
    expect(hook).toMatch(/const \{ enabled = true \} = options;/);
    expect(hook).toMatch(/if \(!enabled\) return;/);
  });

  it("re-arms when enabled changes", () => {
    // Left out of the deps, a phase becoming timeable would not start the
    // timer until something else changed.
    expect(hook).toMatch(/\}, \[watchValue, timeoutMs, enabled\]\);/);
  });

  it("still defaults to on, so an un-updated caller keeps its timeout", () => {
    expect(hook).toMatch(/timeoutMs = 60_000/);
  });
});

describe("the TV host lobby", () => {
  const host = read("src/pages/TVHostController.tsx");

  it("only ejects from a phase that was supposed to move", () => {
    expect(host).toMatch(/\{ enabled: tvPhaseCanStall\(contextPhase\) \}/);
  });

  it("does not eject on a bare phase watch any more", () => {
    // The original call: useIdleTimeout(contextPhase, () => {...}) with no
    // gate at all.
    expect(codeOf(host)).not.toMatch(/useIdleTimeout\(contextPhase,\s*\(\)\s*=>/);
  });

  it("will not offer Start before the context has joined the session", () => {
    expect(host).toMatch(/sessionId: contextSessionId,/);
    expect(host).toMatch(/!contextSessionId \|\| startingGame\}/);
  });

  it("says it is waiting rather than looking ready", () => {
    expect(host).toMatch(/contextSessionId && !startingGame[\s\S]{0,120}?Loader2/);
  });

  it("holds the button down for the whole attempt", () => {
    // startGame is five or six round trips before the phase changes. The
    // press used to leave the button looking exactly as pressable as it had
    // a moment earlier — which invites a second press at the worst moment.
    expect(host).toMatch(/const \[startingGame, setStartingGame\] = useState\(false\);/);
    expect(host).toMatch(/setStartingGame\(true\);/);
    // Released in a finally, so a failed start does not wedge the button.
    expect(host).toMatch(/\} finally \{\s*\n[\s\S]{0,240}?setStartingGame\(false\);/);
    expect(host).toMatch(/isStarting=\{startingGame\}/);
  });
});

describe("the player's join screen", () => {
  const join = read("src/pages/TVJoin.tsx");

  it("is gated the same way", () => {
    // A player who scans while the host is still adding rounds waits in the
    // lobby for as long as the host takes. That is not a stall either.
    expect(join).toMatch(/\{ enabled: tvPhaseCanStall\(phase\) \}/);
  });

  it("keeps its longer timeout and its per-question reset", () => {
    expect(join).toMatch(/`\$\{phase\}-\$\{currentQuestionIndex\}`/);
    expect(join).toMatch(/120_000,/);
  });
});

describe("the multiplayer page they land on", () => {
  const team = read("src/pages/TeamV2.tsx");

  it("waits for auth before deciding nobody is signed in", () => {
    expect(team).toMatch(/if \(!user && authLoading\) \{/);
  });

  it("holds the spinner ahead of the sign-in wall", () => {
    const loadingAt = team.indexOf("if (!user && authLoading) {");
    const wallAt = team.indexOf("// Show login prompt if not authenticated");
    expect(loadingAt).toBeGreaterThan(-1);
    expect(wallAt).toBeGreaterThan(-1);
    expect(loadingAt, "the wall would win the race otherwise").toBeLessThan(wallAt);
  });

  it("still shows the wall to someone who really is signed out", () => {
    // The fix must not turn the page into a permanent spinner.
    expect(team).toMatch(/if \(!user\) \{/);
    expect(team).toMatch(/t\('team\.signInToPlay'\)/);
  });
});

describe("starting the game", () => {
  const ctx = read("src/contexts/TVGameContext.tsx");

  it("no longer fails silently", () => {
    expect(ctx).toMatch(/tvLogError\('startGame', `blocked: contextSessionId=/);
  });

  it("tells the host, and only the host", () => {
    // A guest reaching this branch is a no-op by design; a toast there would
    // be an error message for something nobody tried to do.
    expect(ctx).toMatch(/if \(isHost\) toast\.error\(t\('extra\.tvStartGameFailed'\)\);/);
  });

  it("still refuses to start without a session or without being host", () => {
    expect(ctx).toMatch(/if \(!state\.sessionId \|\| !isHost\) \{/);
  });
});

/**
 * The rest of "Start does nothing" in TV mode.
 *
 * startGame is one long try block with six early `return`s in it, and none of
 * them said anything. handleStartGame wraps the call in try/catch and toasts
 * on failure — but a `return` is not a throw, so that catch never fired for
 * any of them. The host pressed Start and the lobby sat there.
 *
 * Worse, the write that actually starts the game ignored its own result.
 * supabase-js hands back `{ error }` rather than throwing, so a rejected
 * update — a status the CHECK constraint does not allow, an RLS policy that
 * does not match, a drifted column — did nothing at all while the log
 * cheerfully recorded "lobby -> countdown". The phase every screen renders
 * comes from that row through realtime, not from the local setState, so
 * nothing moved and nothing explained why.
 */
describe("startGame reports instead of returning in silence", () => {
  const ctx = read("src/contexts/TVGameContext.tsx");

  it("checks the write that starts the game", () => {
    expect(ctx).toMatch(/const \{ error: startError \} = await supabase\s*\n\s*\.from\('tv_sessions'\)/);
    expect(ctx).toMatch(/if \(startError\) \{[\s\S]{0,220}?toast\.error\(t\('extra\.tvStartGameFailed'\)\);/);
  });

  it("checks the write that starts the questions", () => {
    // A silent failure here leaves the 3-2-1 on the TV and nothing after it.
    expect(ctx).toMatch(/const \{ error: playError \} = await supabase/);
    expect(ctx).toMatch(/if \(playError\) \{[\s\S]{0,220}?toast\.error\(t\('extra\.tvStartGameFailed'\)\);/);
  });

  it("tells the player when the category has no questions for them", () => {
    // questionService returns nothing on purpose when the player's language
    // has no questions for the category — "the UI will show a modal instead".
    // On TV there was no modal and no toast.
    expect(ctx).toMatch(/if \(formattedQuestions\.length === 0\) \{[\s\S]{0,320}?toast\.error\(t\('extra\.noQuestionsInLang'\)\);/);
  });

  it("names what could not be started, so the log identifies the round", () => {
    expect(ctx).toMatch(/No questions available \(category=\$\{categoryId \?\? 'none'\} trivia=\$\{userTriviaId \?\? 'none'\}\)/);
  });

  it("reports an unresolvable category", () => {
    expect(ctx).toMatch(/Failed to resolve category UUID from "\$\{categoryId\}"/);
    expect(ctx).toMatch(/toast\.error\(t\('extra\.tvhCategoriesNotFound'\)\);/);
  });

  it("reports an empty user trivia", () => {
    // Anchored on startGame: startNextRoundFromQueueIfAny has the same line
    // and still returns silently — that is the round-2 freeze, a different
    // symptom from the one reported, and not touched here.
    const trivia = ctx.match(/tvLogError\('startGame', 'User trivia has no questions'\);[\s\S]{0,140}/);
    expect(trivia).not.toBeNull();
    expect(trivia![0]).toMatch(/toast\.error\(t\('extra\.noQuestionsInLang'\)\)/);
  });

  it("has no bare `return` left in the empty-pool branches", () => {
    // Each of the three routes into an empty pool now funnels through the one
    // reported check, rather than returning where it stood.
    expect(codeOf(ctx)).not.toMatch(/tvLogError\('startGame', 'No questions available'\);\s*\n\s*return;/);
  });
});

describe("the early return added to startPlaying", () => {
  const ctx = read("src/contexts/TVGameContext.tsx");

  it("cannot strand the mutex", () => {
    // startPlaying holds startPlayingMutexRef for its whole body and blocks
    // re-entry on it. Returning early without releasing would wedge the round
    // permanently — worse than the bug being fixed. It is released in a
    // finally, so the return is safe; this pins that.
    const fn = ctx.match(/const startPlaying = useCallback\(async \(\) => \{[\s\S]*?\n {2}\}, \[state\.sessionId, prepareForPlaying\]\);/);
    expect(fn, "expected startPlaying").not.toBeNull();
    expect(fn![0]).toMatch(/\} finally \{\s*\n\s*startPlayingMutexRef\.current = false;\s*\n\s*\}/);
    expect(fn![0]).toMatch(/if \(playError\)/);
  });
});

/**
 * The Start button on the screen the host actually presses.
 *
 * The lobby's button was given a pressed state, but the report was about the
 * OTHER Start button — ControllerDirectSelection's, on "Choose which
 * categories you want". Its handler was synchronous and fire-and-forget: the
 * press returned immediately, the button went straight back to looking
 * pressable, and the several seconds of work that followed were invisible.
 */
describe("the Start button on the category-select screen", () => {
  const sel = read("src/components/controller/ControllerDirectSelection.tsx");

  it("awaits the start, so it can stay held down", () => {
    expect(sel).toMatch(/const handleStartGame = async \(\) => \{/);
    expect(sel).toMatch(/await onStartGame\(\{/);
  });

  it("accepts a promise from its parent", () => {
    // Typed `=> void`, the await would resolve instantly and the pressed
    // state would flash rather than hold.
    expect(sel).toMatch(/=> void \| Promise<unknown>;/);
  });

  it("greys out and says what it is doing", () => {
    // ChunkyButton carries disabled:opacity-50, so `disabled` IS the grey.
    expect(sel).toMatch(/disabled=\{queue\.length === 0 \|\| isStarting\}/);
    expect(sel).toMatch(/isStarting\s*\n?\s*\? <Loader2 className="w-5 h-5 mr-2 animate-spin" \/>/);
    expect(sel).toMatch(/t\("categoryWheel\.gameStarting"\)/);
  });

  it("ignores a second press while the first is still running", () => {
    expect(sel).toMatch(/if \(isStarting\) return;/);
  });
});
