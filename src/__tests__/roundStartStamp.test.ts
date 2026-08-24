import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Starting a round must update the local room, not only the database.
 *
 * The round-start screen is driven by the room row: `status === "playing"` and
 * `started_at`, so that every player counts to the same clock. Six paths begin
 * a round, and each wrote those fields to game_rooms and then flipped local
 * phase to "playing" — while leaving the local room row alone, still carrying
 * the previous round's timestamp.
 *
 * On the client that pressed start, the gate therefore saw a room that had not
 * begun: it rendered question one, and the 3-2-1 appeared a beat later when
 * realtime delivered the row back. Question first, countdown second, which is
 * exactly backwards, and only on the device that started the round — so it
 * survived being tested by whoever joined.
 *
 * Two halves, both asserted below: the timestamp written to the database is
 * the timestamp handed to the local room (a second `new Date()` would put the
 * two a few milliseconds apart and make the count wrong by that much), and the
 * stamp happens before anything can read the room.
 */
const source = readFileSync(
  join(process.cwd(), "src/contexts/MultiplayerContextV2.tsx"),
  "utf8"
);

/** Every `.from("game_rooms").update({...})` that begins a round. */
function roundStartWrites(): string[] {
  const all = source.match(
    /await supabase\n\s*\.from\("game_rooms"\)\n\s*\.update\(\{[\s\S]*?\}\)\n\s*\.eq\("id", roomId\);[\s\S]{0,120}/g
  );
  return (all ?? []).filter((block) => /status: "playing"/.test(block));
}

describe("beginning a round", () => {
  const writes = roundStartWrites();

  it("finds every path that starts one", () => {
    // Guards the matcher: a refactor that renamed the table or the call shape
    // would otherwise leave this whole file asserting about nothing.
    expect(writes.length).toBeGreaterThanOrEqual(6);
  });

  it.each(writes.map((w, i) => [i, w] as const))(
    "path %i stamps the local room with the timestamp it wrote",
    (_i, block) => {
      expect(
        block,
        "started_at must come from a captured constant — a second new Date() " +
          "would disagree with the row by a few milliseconds"
      ).toMatch(/started_at: roundStartedAt,/);

      expect(
        block,
        "the local room must be stamped right after the write, before phase " +
          "flips to playing, or this client renders question one first"
      ).toMatch(/stampRoomStarted\(roundStartedAt, /);
    }
  );

  it("never writes an inline timestamp for a round start", () => {
    for (const block of writes) {
      expect(block, "an inline new Date() cannot be mirrored to the local room")
        .not.toMatch(/started_at: new Date\(\)/);
    }
  });
});

describe("the local stamp itself", () => {
  it("sets the three fields the round-start screen reads", () => {
    const fn = source.match(/const stampRoomStarted = useCallback\([\s\S]*?\n {2}\}, \[\]\);/);
    expect(fn, "expected stampRoomStarted in the multiplayer context").not.toBeNull();
    for (const field of ['status: "playing"', "started_at: startedAt", "current_game_id:"]) {
      expect(fn![0], `the local room must carry ${field}`).toContain(field);
    }
  });

  it("does nothing when there is no room to stamp", () => {
    const fn = source.match(/const stampRoomStarted = useCallback\([\s\S]*?\n {2}\}, \[\]\);/)![0];
    expect(fn, "a null room must be left alone rather than invented").toMatch(/prev\.currentRoom\s*\n?\s*\?/);
  });
});
