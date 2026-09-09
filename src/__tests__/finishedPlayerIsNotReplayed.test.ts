/**
 * A finished player never plays the same round twice.
 *
 * Whoever finishes first sits on the results screen while the others
 * answer, and the room stays "playing" the whole time. Three things could
 * pull that client back into the round it had just played, from question
 * one, resetting its own row and rewriting the results everyone had seen
 * (owner: "one player sees round from scratch and plays again and the
 * results changed"):
 *
 *  - joining the room again (the phone came back, the card was tapped)
 *    resumed a finished player into the LOBBY phase, and a lobby client in
 *    a playing room is exactly what the subscription syncs into the game;
 *  - the subscription's own SUBSCRIBED handler, which fires again on every
 *    realtime reconnect;
 *  - the room UPDATE handler, on any write to the room row.
 *
 * The client now remembers the game it finished, and no entry path takes
 * it into that game id again. Only a new game id can.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ctx = readFileSync(join(process.cwd(), "src/contexts/MultiplayerContextV2.tsx"), "utf8");

describe("the client remembers the game it finished", () => {
  it("on both finish paths - the last answer, and finishing by skip", () => {
    expect(ctx).toMatch(/const finishedGameIdRef = useRef<string \| null>\(null\);/);
    expect(ctx).toMatch(/finishedGameIdRef\.current = room\.current_game_id \?\? expectedGameIdRef\.current;\s*void supabase\s*\.from\("room_participants"\)\s*\.update\(\{ status: "finished" \}\)/);
    expect(ctx).toMatch(/if \(finished\) \{\s*finishedGameIdRef\.current = state\.currentRoom\.current_game_id \?\? expectedGameIdRef\.current;\s*\}/);
  });

  it("and on resume, where a finished player lands on results, not in the lobby", () => {
    expect(ctx).toMatch(/\} else if \(room\.status === "playing"\) \{[\s\S]*?newPhase = userFinished \? "results" : "playing";/);
    expect(ctx).not.toMatch(/else if \(room\.status === "playing" && !userFinished\)/);
    expect(ctx).toMatch(/if \(userFinished && room\.current_game_id\) \{\s*finishedGameIdRef\.current = room\.current_game_id;\s*\}/);
  });

  it("forgets it only on leaving the room", () => {
    const clears = ctx.match(/finishedGameIdRef\.current = null;/g) ?? [];
    expect(clears).toHaveLength(2);
  });
});

describe("no entry path re-enters a finished game", () => {
  it("the room UPDATE handler", () => {
    expect(ctx).toMatch(/const finishedThisGame =\s*!!updated\.current_game_id &&\s*updated\.current_game_id === finishedGameIdRef\.current;/);
    expect(ctx).toMatch(/if \(updated\.status === "playing" && !finishedThisGame && \(currentPhase === "lobby" \|\| currentPhase === "results" \|\| isNewGameWhilePlaying\)\)/);
  });

  it("the SUBSCRIBED handler, which fires again on every reconnect", () => {
    expect(ctx).toMatch(/const finishedThisGame =\s*!!freshRoom\.current_game_id &&\s*freshRoom\.current_game_id === finishedGameIdRef\.current;/);
    expect(ctx).toMatch(/if \(\(currentPhase === "lobby" \|\| currentPhase === "results"\) && !alreadySyncedThisGame && !finishedThisGame\)/);
  });
});
