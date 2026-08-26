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
    expect(host).toMatch(/disabled=\{players\.length < 1 \|\| queue\.length === 0 \|\| !contextSessionId\}/);
  });

  it("says it is waiting rather than looking ready", () => {
    expect(host).toMatch(/contextSessionId \? <Play [\s\S]{0,80}?Loader2/);
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
