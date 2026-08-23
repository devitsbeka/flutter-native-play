import { describe, expect, it } from "vitest";
import { rankPlayers, MAX_SHOWN, type RacePlayer } from "@/components/game/LiveRaceStrip";

/**
 * The strip's order is the feature — an overtake is meant to be a thing you
 * watch happen. That only reads as true if positions move when, and only
 * when, a score moves them.
 */

const player = (id: string, score: number, joined: string): RacePlayer => ({
  id,
  user_id: id,
  nickname: id,
  avatar_url: null,
  score,
  joined_at: joined,
});

describe("live race ranking", () => {
  it("puts the highest score first", () => {
    const ranked = rankPlayers([
      player("b", 120, "2026-01-01T00:00:01Z"),
      player("a", 300, "2026-01-01T00:00:02Z"),
      player("c", 200, "2026-01-01T00:00:03Z"),
    ]);
    expect(ranked.map((p) => p.id)).toEqual(["a", "c", "b"]);
  });

  it("holds a stable order while everyone is still on zero", () => {
    // The state every round opens in. Sorting equal scores without a
    // tie-break lets this reshuffle on any re-render, so the avatars swap
    // places before a single question has been answered.
    const start = [
      player("first", 0, "2026-01-01T00:00:01Z"),
      player("second", 0, "2026-01-01T00:00:02Z"),
      player("third", 0, "2026-01-01T00:00:03Z"),
    ];
    const expected = ["first", "second", "third"];
    for (const order of [start, [...start].reverse(), [start[1], start[2], start[0]]]) {
      expect(rankPlayers(order).map((p) => p.id)).toEqual(expected);
    }
  });

  it("moves a player up exactly when they overtake", () => {
    const before = rankPlayers([
      player("leader", 200, "2026-01-01T00:00:01Z"),
      player("chaser", 150, "2026-01-01T00:00:02Z"),
    ]);
    expect(before.map((p) => p.id)).toEqual(["leader", "chaser"]);

    // Level with the leader: not past them yet, and the earlier joiner keeps
    // the place rather than the newcomer taking it on a tie.
    const level = rankPlayers([
      player("leader", 200, "2026-01-01T00:00:01Z"),
      player("chaser", 200, "2026-01-01T00:00:02Z"),
    ]);
    expect(level.map((p) => p.id)).toEqual(["leader", "chaser"]);

    const past = rankPlayers([
      player("leader", 200, "2026-01-01T00:00:01Z"),
      player("chaser", 210, "2026-01-01T00:00:02Z"),
    ]);
    expect(past.map((p) => p.id)).toEqual(["chaser", "leader"]);
  });

  it("treats a missing score as nothing, not as a crash", () => {
    const ranked = rankPlayers([
      { ...player("scored", 50, "2026-01-01T00:00:02Z") },
      { ...player("nulled", 0, "2026-01-01T00:00:01Z"), score: null },
    ]);
    expect(ranked.map((p) => p.id)).toEqual(["scored", "nulled"]);
  });

  it("does not mutate what it is given", () => {
    const input = [
      player("b", 10, "2026-01-01T00:00:01Z"),
      player("a", 20, "2026-01-01T00:00:02Z"),
    ];
    const snapshot = input.map((p) => p.id);
    rankPlayers(input);
    expect(input.map((p) => p.id)).toEqual(snapshot);
  });

  it("keeps the leaders when the room is bigger than the strip", () => {
    // A room can hold more players than fit across a phone. Whoever is cut
    // must be cut from the back — losing the leader off a leaderboard would
    // be the one unacceptable outcome. The rest are on the results screen,
    // which scrolls vertically.
    const many = Array.from({ length: MAX_SHOWN + 6 }, (_, i) =>
      player(`p${i}`, i * 10, `2026-01-01T00:00:${String(i).padStart(2, "0")}Z`),
    );
    const shown = rankPlayers(many).slice(0, MAX_SHOWN);

    expect(shown).toHaveLength(MAX_SHOWN);
    // Highest score first, and the top scorer is never the one dropped.
    expect(shown[0].id).toBe(`p${many.length - 1}`);
    const scores = shown.map((p) => p.score as number);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});
