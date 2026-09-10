/**
 * The online-room audit, phase C: a round that cannot hang, and exits that
 * cost nobody by surprise.
 *
 * Found tracing a room from Start to the standings:
 *
 *  - a room stayed "playing" for good when the last unfinished player
 *    vanished, because only a player's OWN finish ran the completion check;
 *  - the hour-old "stale" reset wiped a private round whose slow friend
 *    was allowed a day to play it — and a guest's reset updated nothing on
 *    the server while the client went on as if it had;
 *  - the host's back arrow on the results moved everyone else off THEIR
 *    results, mid-read;
 *  - a deleted room left its players in a lobby for a row that no longer
 *    existed (the channel heard UPDATE only);
 *  - the head of the queue was deleted before the round was known to have
 *    started, so a start that lost the claim lost the round;
 *  - a player on the /team hub was not brought into their starting round,
 *    while a player on any other page was;
 *  - the standings listed seats the pot ignores;
 *  - the results screen still carried a client-computed payout, behind an
 *    error-message sniff;
 *  - the game screen's back arrow forfeited the stake on one tap;
 *  - the rematch removed seats that were never asked, and told nobody.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const game = read("src/components/team/MultiplayerGameScreenV2.tsx");
const watcher = read("src/components/system/RoundStartWatcher.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const LANGS = ["en", "ka", "de", "es", "fr", "it", "pt"];

describe("a round cannot hang on a seat that left", () => {
  it("the completion check runs when a seat drops out, not only on an own finish", () => {
    expect(ctx).toMatch(/const ownFinish =\s*\n\s*payload\.eventType === "UPDATE" &&\s*\n\s*changedRow\?\.status === "finished" &&\s*\n\s*changedRow\?\.user_id === user\?\.id;/);
    expect(ctx).toMatch(/const seatDroppedOut =\s*\n\s*payload\.eventType === "DELETE" \|\|\s*\n\s*\(payload\.eventType === "UPDATE" && changedRow\?\.status === "disconnected"\);/);
    expect(ctx).toMatch(/if \(ownFinish \|\| seatDroppedOut\) \{/);
  });

  it("and the extra runs cannot double-complete: the write is still a CAS on status and round", () => {
    expect(ctx).toMatch(/\.eq\("status", "playing"\); \/\/ Prevent double-update race/);
    expect(ctx).toMatch(/completeQuery = completeQuery\.eq\("current_game_id", roomCheck\.current_game_id\);/);
  });
});

describe("the stale reset", () => {
  it("leaves a round that is still within its settle deadline alone", () => {
    expect(ctx).toMatch(/const roundStillOpen =\s*\n\s*room\.status === "playing" &&\s*\n\s*!!room\.current_game_id &&\s*\n\s*!roundDeadlinePassed\(/);
    expect(ctx).toMatch(/room\.is_public \? PUBLIC_ROUND_DEADLINE_MS : PRIVATE_ROUND_DEADLINE_MS,/);
  });

  it("and is the host's to perform — a guest's write would silently do nothing", () => {
    expect(ctx).toMatch(/const amHost = room\.host_user_id === user\.id;/);
    expect(ctx).toMatch(/if \(stale && \(room\.status === "playing" \|\| room\.status === "completed"\) && !roundStillOpen && amHost\) \{/);
  });
});

describe("the results screen is each player's own", () => {
  it("a room going back to waiting moves nobody off their results", () => {
    expect(ctx).not.toMatch(/updated\.status === "waiting" && currentPhase === "results"/);
    expect(ctx).not.toMatch(/Room returned to waiting state, transitioning to lobby/);
  });

  it("continueInRoom still flips the phase without a write when the room already waits", () => {
    expect(ctx).toMatch(/if \(currentRoomState\?\.status !== "waiting" && currentRoomState\?\.status !== "playing"\) \{/);
  });

  it("ranks the seats the pot ranks: no invitations, no observing host", () => {
    expect(results).toMatch(/const rankedParticipants: RankedParticipant\[\] = participants\s*\n\s*\.filter\(\(p\) => \(p\.status as string\) !== "invited"\)\s*\n\s*\.filter\(\(p\) => !\(hostIsObserver && p\.user_id === currentRoom\?\.host_user_id\)\)/);
  });
});

describe("a deleted room", () => {
  it("is heard on the room channel and closed like a cancelled one", () => {
    expect(ctx).toMatch(/\{ event: "DELETE", schema: "public", table: "game_rooms" \},/);
    // No filter: a DELETE carries the old primary key only, and a filtered
    // DELETE needs REPLICA IDENTITY FULL. The id is compared by hand.
    expect(ctx).toMatch(/const gone = \(payload\.old as \{ id\?: string \} \| null\)\?\.id;\s*\n\s*if \(!gone \|\| gone !== roomId\) return;/);
  });
});

describe("the queue's head", () => {
  it("is deleted only once the round has actually started", () => {
    expect(ctx).toMatch(/const popQueueHead = \(\) => \(async \(\) => \{/);
    expect(ctx).not.toMatch(/await queueMaintenance;/);
    const pops = ctx.match(/stampRoomStarted\(roundStartedAt, game\?\.id\);\s*\n\s*\/\/ The round is on; the head of the queue is played\.\s*\n\s*void popQueueHead\(\);/g) ?? [];
    expect(pops).toHaveLength(2);
  });
});

describe("the watcher brings a player in from the hub", () => {
  it("/team is 'already there' only while the provider holds this room", () => {
    expect(watcher).toMatch(/getHeldRoomId\(\) !== room\.id;/);
    expect(watcher).toMatch(/if \(!isInterruptible\(pathRef\.current\) && !onHubWithoutRoom\) return;/);
    expect(watcher).toMatch(/navigate\(onHubWithoutRoom && room\.room_code \? routeForRoom\(room\) : "\/team"\);/);
    // The provider publishes the room it holds.
    expect(ctx).toMatch(/setHeldRoomId\(state\.currentRoom\?\.id \?\? null\);/);
  });
});

describe("leaving a live round", () => {
  it("is asked first, except of the observing host who is not staked", () => {
    expect(game).toMatch(/const handleExit = \(\) => \{\s*\n\s*if \(isHost && hostIsObserver\) \{\s*\n\s*leaveRound\(\);\s*\n\s*return;\s*\n\s*\}\s*\n\s*setConfirmLeave\(true\);/);
    expect(game).toMatch(/<AlertDialog open=\{confirmLeave\} onOpenChange=\{setConfirmLeave\}>/);
    expect(game).toMatch(/<AlertDialogAction onClick=\{leaveRound\}/);
  });

  it("with the words in every language", () => {
    for (const lang of LANGS) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["leaveRoundTitle", "leaveRoundBody", "leaveRoundConfirm"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "[^"]+",`));
      }
    }
  });
});

describe("the rematch removes only the asked, and tells them", () => {
  it("a seat that sat down during the ask is not removed for not answering", () => {
    expect(lobby).toMatch(/const asked = new Set\(askedSeats\.map\(\(s\) => s\.user_id\)\);/);
    expect(lobby).toMatch(/asked\.has\(p\.user_id\) && \(p\.status as string\) !== "ready"/);
  });

  it("a removed seat gets a notification saying so", () => {
    expect(lobby).toMatch(/type: "rematch_removed",/);
    expect(lobby).toMatch(/message: t\("extra\.rematchRemovedBody", \{ name: hostName \}\),/);
    for (const lang of LANGS) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/rematchRemovedTitle: "[^"]+",/);
      expect(src, lang).toMatch(/rematchRemovedBody: "[^"]*\{name\}[^"]*",/);
    }
  });
});
