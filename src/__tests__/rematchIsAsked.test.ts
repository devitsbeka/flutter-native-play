/**
 * A rematch is asked, not sprung.
 *
 * A round used to roll straight into the next: the host picked a category
 * on the results screen and every other player was pulled into it by the
 * room's realtime status, whether they were still looking or not — and,
 * since a room is played for a pot, staked for it. The owner's rule: the
 * host's button says New Game, a new game starts a new pot, and the players
 * in the room are asked "do you want a rematch?" with the host's name on it.
 * And a PRO player who is not the host can ask the same question the other
 * way round, with a pick of their own, for the table to accept or decline.
 *
 * It rides on the notifications table — a row per seat, accept/decline on
 * the card — and touches the ROOM only from the host's hand.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const util = read("src/utils/rematchRequests.ts");
const card = read("src/components/notifications/CompactNotificationCard.tsx");
const panel = read("src/components/home/NotificationsPanel.tsx");
const page = read("src/pages/Notifications.tsx");
const ctx = read("src/contexts/NotificationsContext.tsx");

describe("the host's New Game asks", () => {
  it("sends the room to its lobby with the pick, and startGame is no longer called from here", () => {
    expect(results).toMatch(/const applied = await applyRematchPick\(currentRoom\.id, pick\);/);
    expect(results).toMatch(/await askRematch\(pick, "host_new_game"\);/);
    expect(results).not.toMatch(/await startGame\(\)/);
  });

  it("every seat at the table is asked, the asker's own excluded", () => {
    expect(results).toMatch(/participants\.filter\(\(p\) => p\.user_id !== user\?\.id && \(p\.status as string\) !== "invited"\)/);
    expect(util).toMatch(/recipientIds\.filter\(\(id\) => id && id !== requester\.id\)/);
  });

  it("never over a live round", () => {
    expect(util).toMatch(/if \(fresh\?\.status === "playing"\) return false;/);
  });

  it("queued rounds ask the same question", () => {
    const fn = results.slice(results.indexOf("const handleAddToQueue"), results.indexOf("continueInRoom();", results.indexOf("const handleAddToQueue")));
    expect(fn).toMatch(/"host_new_game"/);
  });
});

describe("a player can ask, with their own pick", () => {
  it("the door is PRO's; anyone else meets the wall on the tap", () => {
    expect(results).toMatch(/onClick=\{\(\) => \(isVip \? setShowAskPicker\(true\) : setShowAskWall\(true\)\)\}/);
    expect(results).toMatch(/<PlayLimitModal reason="rooms" isOpen=\{showAskWall\}/);
    expect(results).toMatch(/\{t\("extra\.rematchAskCta"\)\}/);
  });

  it("the ask writes notifications, and nothing to the room", () => {
    const fn = results.slice(results.indexOf("const handleAskPick"), results.indexOf("const handleAskRandom"));
    expect(fn).toMatch(/askRematch\(pick, "player_ask"\)/);
    expect(fn).not.toMatch(/from\("game_rooms"\)/);
    expect(fn).not.toMatch(/applyRematchPick/);
  });

  it("one pick, no queue — a request is one game", () => {
    expect(results).toMatch(/isOpen=\{showAskPicker\}[\s\S]*?showQueueOption=\{false\}/);
  });
});

describe("the answer", () => {
  it("the host's yes reshapes the room; a player's yes only goes there", () => {
    expect(util).toMatch(/if \(isHost && data\.requester_id !== userId\) \{\s*\n\s*await applyRematchPick\(data\.room_id,/);
  });

  it("a player's no gives up the seat — a seat that stays is staked", () => {
    expect(util).toMatch(/if \(!isHost\) \{\s*\n\s*await supabase\.from\("room_participants"\)\.delete\(\)\.eq\("room_id", data\.room_id\)\.eq\("user_id", userId\);/);
  });

  it("is offered on the card, in both lists", () => {
    expect(card).toMatch(/const isRematch = notification\.type === 'rematch_request';/);
    expect(card).toMatch(/isFriendRequest \|\| isGameInvite \|\| isJoinRequest \|\| isRematch\) && !hasActionTaken/);
    for (const src of [panel, page]) {
      expect(src).toMatch(/onAcceptRematch=\{\(n\) => void handleRematchAnswer\(n, true\)\}/);
      expect(src).toMatch(/onDeclineRematch=\{\(n\) => void handleRematchAnswer\(n, false\)\}/);
    }
  });

  it("and the ask is a popup right now, not only a bell badge", () => {
    expect(ctx).toMatch(/newNotification\.type === 'room_ping' \|\| newNotification\.type === 'rematch_request'/);
  });
});

describe("the words, in every language", () => {
  it("all seven carry the five keys", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      for (const key of ["rematchAskCta", "rematchAskSent", "rematchRequestTitle", "rematchRequestBody", "rematchNewGameBody"]) {
        expect(src, `${lang}.${key}`).toMatch(new RegExp(`^    ${key}: "[^"]+",$`, "m"));
      }
    }
  });
});
