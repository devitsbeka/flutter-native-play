/**
 * A private round pays out when everyone has played it.
 *
 * Private rooms are invited friends playing at different times — one on the
 * bus, one after dinner — so the first to finish arrives at the results
 * screen with a scoreboard of one. Settling then would rank a full room
 * against that single score and pay the pot out on it (owner: "private rooms
 * can be played in different times and when all invited players play the
 * round we give rewards after that").
 *
 * So the whole chain waits: the round snapshot, the stats and the pot are
 * held together, nobody is charged a stake, and the early finishers see the
 * scores so far with a line saying the rewards come when everyone has
 * played. When the last player finishes, their device settles for everyone
 * and the ones who are gone get a push.
 *
 * The wait has an end — somebody always forgets — and no job watches the
 * clock, so like the room-retirement rule it holds at READ time: the next
 * device to open the results after the deadline settles with whoever played.
 * Nothing is lost while nobody looks, because the stakes are collected by
 * the settlement itself.
 *
 * A PUBLIC room is untouched: it settles the moment the round ends, in front
 * of everyone who was in it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIVATE_ROUND_DEADLINE_MS,
  allRoundPlayersFinished,
  hasFinishedRound,
  playersStillOut,
  roundDeadlinePassed,
  roundSettleTiming,
} from "@/utils/roundSettlement";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const results = read("src/components/team/GameResultsScreenV2.tsx");

const TOTAL = 5;
const seat = (over: Record<string, unknown> = {}) => ({
  user_id: "u1",
  status: "playing",
  current_question: 0,
  ...over,
});
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

describe("who counts as having played", () => {
  it("a seat marked finished has", () => {
    expect(hasFinishedRound(seat({ status: "finished" }), TOTAL)).toBe(true);
  });

  it("and so has one whose question index passed the last question", () => {
    // The two are written at different moments; a lost status update must
    // not hold the round open forever.
    expect(hasFinishedRound(seat({ current_question: TOTAL }), TOTAL)).toBe(true);
    expect(hasFinishedRound(seat({ current_question: TOTAL - 1 }), TOTAL)).toBe(false);
  });

  it("but a room that cannot say how long it is does not finish anyone by index", () => {
    expect(hasFinishedRound(seat({ current_question: 99 }), null)).toBe(false);
    expect(hasFinishedRound(seat({ current_question: 99, status: "finished" }), null)).toBe(true);
  });
});

describe("waiting for the room", () => {
  const ctx = { hostIsObserver: false, hostUserId: "host" };

  it("holds while somebody who can still answer has not", () => {
    const seats = [seat({ user_id: "a", status: "finished" }), seat({ user_id: "b" })];
    expect(allRoundPlayersFinished(seats, ctx, TOTAL)).toBe(false);
    expect(playersStillOut(seats, ctx, TOTAL).map((p) => p.user_id)).toEqual(["b"]);
  });

  it("and lets go once they all have", () => {
    const seats = [
      seat({ user_id: "a", status: "finished" }),
      seat({ user_id: "b", current_question: TOTAL }),
    ];
    expect(allRoundPlayersFinished(seats, ctx, TOTAL)).toBe(true);
    expect(playersStillOut(seats, ctx, TOTAL)).toEqual([]);
  });

  it("never waits on a seat that cannot answer", () => {
    // An invitation nobody accepted, somebody who left mid-round, and the
    // host watching their own trivia — the rule roundPlayers already owns.
    const seats = [
      seat({ user_id: "a", status: "finished" }),
      seat({ user_id: "invitee", status: "invited" }),
      seat({ user_id: "gone", status: "disconnected" }),
      seat({ user_id: "host" }),
    ];
    expect(allRoundPlayersFinished(seats, { hostIsObserver: true, hostUserId: "host" }, TOTAL)).toBe(true);
  });
});

describe("the deadline that ends the wait", () => {
  it("is a day", () => {
    expect(PRIVATE_ROUND_DEADLINE_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("has not passed while the round is young", () => {
    expect(roundDeadlinePassed(ago(60_000))).toBe(false);
    expect(roundDeadlinePassed(ago(PRIVATE_ROUND_DEADLINE_MS - 60_000))).toBe(false);
  });

  it("and has once the day is up", () => {
    expect(roundDeadlinePassed(ago(PRIVATE_ROUND_DEADLINE_MS + 60_000))).toBe(true);
  });

  it("a round that cannot say when it began waits for its players instead", () => {
    // Paying out on an unreadable timestamp is worse than waiting.
    expect(roundDeadlinePassed(null)).toBe(false);
    expect(roundDeadlinePassed(undefined)).toBe(false);
    expect(roundDeadlinePassed("not a date")).toBe(false);
  });

  it("and a clock running fast cannot bring it forward", () => {
    expect(roundDeadlinePassed(new Date(Date.now() + 3 * 3600_000).toISOString())).toBe(false);
  });
});

describe("when a device may settle", () => {
  const ctx = { hostIsObserver: false, hostUserId: "host" };
  const half = [seat({ user_id: "a", status: "finished" }), seat({ user_id: "b" })];

  it("a public round: immediately, however few have finished", () => {
    expect(
      roundSettleTiming({
        isPublic: true,
        participants: half,
        ctx,
        totalQuestions: TOTAL,
        startedAt: ago(1000),
      }),
    ).toBe("ready");
  });

  it("a private round: not while it is still out with somebody", () => {
    expect(
      roundSettleTiming({
        isPublic: false,
        participants: half,
        ctx,
        totalQuestions: TOTAL,
        startedAt: ago(1000),
      }),
    ).toBe("waiting_for_players");
  });

  it("a private round: once the last of them plays", () => {
    const all = [
      seat({ user_id: "a", status: "finished" }),
      seat({ user_id: "b", status: "finished" }),
    ];
    expect(
      roundSettleTiming({
        isPublic: false,
        participants: all,
        ctx,
        totalQuestions: TOTAL,
        startedAt: ago(1000),
      }),
    ).toBe("ready");
  });

  it("a private round: or once the deadline ends the wait for them", () => {
    expect(
      roundSettleTiming({
        isPublic: false,
        participants: half,
        ctx,
        totalQuestions: TOTAL,
        startedAt: ago(PRIVATE_ROUND_DEADLINE_MS + 1000),
      }),
    ).toBe("ready");
  });
});

describe("what the results screen does with it", () => {
  it("holds the whole chain, not just the pot", () => {
    // The round snapshot, the stats and the pot settle together or not at
    // all, so the gate is before the lot of them.
    expect(results).toMatch(/if \(waitingForPlayers\) return;/);
    const gate = results.indexOf("if (waitingForPlayers) return;");
    expect(gate).toBeLessThan(results.indexOf('supabase.rpc("complete_room_round"'));
    expect(gate).toBeLessThan(results.indexOf("settleRoomRound(currentRoom.id"));
  });

  it("re-runs when somebody else finishes, so the last player settles it", () => {
    // `participants` and the hold are both dependencies: the round opens
    // itself the moment the last seat comes in.
    expect(results).toMatch(
      /participants, mltAllVotersDone, isMostLikelyRound, waitingForPlayers, isPublicRoom\]\);/,
    );
  });

  it("reads the round's own start for the deadline — no new column", () => {
    expect(results).toMatch(/startedAt: currentRoom\?\.started_at,/);
  });

  it("says so on screen, with the scores that do exist under it", () => {
    expect(results).toMatch(/\{waitingForPlayers && \(/);
    expect(results).toMatch(/t\("extra\.roundWaitingForPlayers", \{ count: stillOut \}\)/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/roundWaitingForPlayers: "[^"]*\{count\}[^"]*",/);
    }
  });

  it("and shows no coins while it waits — nothing has been staked or paid", () => {
    // netFor falls back to this player's own settled numbers, which are
    // still zero, so the podium draws no pot pills.
    expect(results).toMatch(/if \(p\.isMe && \(coinsEarned > 0 \|\| coinsLost > 0\)\) return coinsEarned - coinsLost;/);
    expect(results).toMatch(/if \(net === undefined\) return null;/);
  });
});

describe("telling the players who are gone", () => {
  it("only a private room pushes — a public one settled in front of everyone", () => {
    expect(results).toMatch(/if \(!isPublicRoom && currentRoom\.current_game_id\) \{/);
    expect(results).toMatch(/kind: "room_round_settled",/);
  });

  it("fire-and-forget, like every other push this app sends", () => {
    expect(results).toMatch(/\.invoke\("send-social-push", \{[\s\S]*?\}\)\s*\n\s*\.catch\(\(\) => \{\}\);/);
  });

  it("and the server refuses to send for a round that did not settle", () => {
    const fn = read("supabase/functions/send-social-push/index.ts");
    expect(fn).toMatch(/if \(!game\.stakes_applied\) return json\(\{ sent: 0, skipped: "not_settled" \}\);/);
    // The caller has to be in the room, and the round has to be its round.
    expect(fn).toMatch(/if \(!membership\) return json\(\{ error: "Not in this room" \}, 403\);/);
    expect(fn).toMatch(/\.eq\("id", gameId\)\s*\n\s*\.eq\("room_id", room\.id\)/);
  });

  it("once per player per round, however many devices ask", () => {
    const fn = read("supabase/functions/send-social-push/index.ts");
    expect(fn).toMatch(/detail: `\$\{gameId\}:\$\{userId\}`/);
    expect(fn).toMatch(/if \(claimError\) continue;/);
  });

  it("to everyone but the device that settled, and never to an empty seat", () => {
    const fn = read("supabase/functions/send-social-push/index.ts");
    expect(fn).toMatch(/s\.user_id !== callerId && String\(s\.status\) !== "invited"/);
  });

  it("in the reader's own language, with copy for all seven", () => {
    const copy = read("supabase/functions/_shared/pushCopy.ts");
    expect(copy).toMatch(/\| "room_round_settled"/);
    expect(copy).toMatch(/room_round_settled: \{ icon: `\$\{SITE\}\/push\/trophy\.png`, route: "\/team" \}/);
    const block = copy.slice(copy.indexOf("  room_round_settled: {\n    ka:"));
    for (const lang of ["ka", "en", "de", "es", "fr", "it", "pt"]) {
      expect(block.slice(0, 1200), lang).toContain(`${lang}: { title:`);
    }
  });
});
