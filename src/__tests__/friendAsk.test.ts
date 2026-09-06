/**
 * Becoming friends from a lobby, and answering the ask wherever you are.
 *
 * Owner's ask: a + on the lobby rows of players who are not friends yet;
 * the request arriving as a modal with one-tap accept / decline / block, or
 * close it for now — in which case it stays in the notification list as new.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/lobby/UniversalLobby.tsx");
const room = read("src/components/team/RoomLobbyV2.tsx");
const gate = read("src/components/team/FriendRequestGate.tsx");
const modal = read("src/components/shared/PersonAskModal.tsx");

describe("a + on the row of somebody who is not a friend yet", () => {
  it("the row offers it, and a tick once it is sent", () => {
    expect(lobby).toMatch(/onAddFriend\?: \(\) => void;/);
    expect(lobby).toMatch(/friendRequested\?: boolean;/);
    expect(lobby).toMatch(/onClick=\{player\.onAddFriend\}\s*\n\s*aria-label=\{addFriendLabel\}/);
    expect(lobby).toMatch(/<UserPlus className=\{addFriendIcon\}/);
    expect(lobby).toMatch(/aria-label=\{friendRequestedLabel\}[^>]*>\s*\n\s*<Check /);
    // Beside the body, never inside it: the body can itself be a button.
    expect(lobby).toMatch(/\{Body\}\s*\n\s*\{addFriend\}\s*\n\s*\{call\}\s*\n\s*\{armband\}/);
  });

  it("the room lobby wires it for everyone who is not you and not a friend", () => {
    expect(room).toMatch(/if \(!user \|\| userId === user\.id \|\| friendIds\.has\(userId\)\) return \{\};/);
    expect(room).toMatch(/if \(askedIds\.has\(userId\)\) return \{ friendRequested: true \};/);
    expect(room).toMatch(/void sendFriendRequest\(userId\)\.then\(\(ok\) => \{\s*\n\s*if \(ok\) setAskedIds/);
    expect(room).toMatch(/\.\.\.friendAsk\(p\.user_id\),/);
    expect(room).toMatch(/addFriend: t\("extra\.lobbyAddFriend"\),\s*\n\s*friendRequested: t\("extra\.lobbyFriendRequested"\),/);
  });
});

describe("the ask arrives as a card", () => {
  it("mounted app-wide beside the invite gate", () => {
    expect(read("src/App.tsx")).toMatch(/<GlobalGameInviteGate \/>[\s\S]*?<GlobalFriendRequestGate \/>/);
  });

  it("fed by the friend_request notifications the context already streams, fresh ones only", () => {
    expect(gate).toMatch(/n\.type === "friend_request" && !n\.read_at/);
    expect(gate).toMatch(/alreadyWaiting\.current = new Set\(asks\.map\(\(n\) => n\.id\)\)/);
    expect(gate).toMatch(/<PersonAskModal\b/);
  });

  it("accept, decline and block each answer and record the outcome", () => {
    expect(gate).toMatch(/await acceptFriendRequest\(data\.friendship_id\)/);
    expect(gate).toMatch(/markNotificationActioned\(next\.id, ok \? "accepted" : null\)/);
    expect(gate).toMatch(/const decline = async[\s\S]*?declineFriendRequest\(data\.friendship_id\);[\s\S]*?markNotificationActioned\(next\.id, "declined"\)/);
    expect(gate).toMatch(/const block = async[\s\S]*?declineFriendRequest[\s\S]*?blockUser\(data\.sender_id\)[\s\S]*?markNotificationActioned\(next\.id, "declined"\)/);
    expect(gate).toMatch(/tertiaryLabel=\{t\("moderation\.block"\)\}/);
  });

  it("close for now writes nothing, so the bell still shows it as new", () => {
    expect(gate).toMatch(/const closeForNow = \(\) => \{\s*\n\s*if \(next\) settle\(next\.id\);\s*\n\s*\};/);
    expect(gate).toMatch(/closeLabel=\{t\("extra\.friendAskLater"\)\}\s*\n\s*onClose=\{closeForNow\}/);
    // The modal offers the close only when asked to, and the backdrop is it too.
    expect(modal).toMatch(/onClose\?: \(\) => void;/);
    expect(modal).toMatch(/\{onClose && \(\s*\n\s*<button/);
    expect(modal).toMatch(/onClick=\{onClose\}\s*\n\s*style=\{\{/);
    expect(modal).toMatch(/onClick=\{\(e\) => e\.stopPropagation\(\)\}/);
  });

  it("the outcome helper merges the row's data and marks it read", () => {
    const util = read("src/utils/notificationActions.ts");
    expect(util).toMatch(/\.\.\.\(action \? \{ action_taken: action \} : \{\}\)/);
    expect(util).toMatch(/\.update\(\{ read_at: new Date\(\)\.toISOString\(\), data: merged \}\)/);
  });

  it("in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      for (const key of ["lobbyAddFriend", "lobbyFriendRequested", "friendAskBody", "friendAskLater"]) {
        expect(locale, `${lang}.${key}`).toMatch(new RegExp(`${key}: "`));
      }
    }
  });
});
