/**
 * An absent player can be invited back from their row, and the host's
 * controls sit before the score.
 *
 * A public room's Start counts online players only, so a host whose guest
 * had wandered off saw "needs two online" with nothing to do about it
 * (owner: "if player is offline i can't start game ... we need invite
 * button before the delete icon to invite player again easily"). The
 * battle lobby already marked absent seats and called them back; the
 * classic lobby marks them now and offers the invite. And the bin lost its
 * white disc and its alarm red (owner: "show delete icon more lighter, it
 * is too red now, do not need white circle container behind, show just
 * icon and put before the round count").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const universal = read("src/components/lobby/UniversalLobby.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");

describe("the row", () => {
  it("draws the invite as a bare paper plane, and the bin as a quiet bare icon", () => {
    expect(universal).toMatch(/const bareIconClass = cn\(\s*\n\s*"shrink-0 flex items-center justify-center rounded-full",/);
    expect(universal).toMatch(/className=\{cn\(bareIconClass, "text-\[#8858d5\]"\)\}\s*\n\s*>\s*\n\s*<Send/);
    expect(universal).toMatch(/className=\{cn\(bareIconClass, "text-\[#e0245e\]\/45"\)\}\s*\n\s*>\s*\n\s*<Trash2/);
    expect(universal).not.toMatch(/"bg-white\/60 text-\[#e0245e\]"/);
    expect(universal).not.toMatch(/bg-amber-400 font-\[Nunito\] font-bold/);
  });

  it("puts both before the score", () => {
    expect(universal).toMatch(/const score =\s*\n\s*player\.score !== undefined \? \(/);
    expect(universal).toMatch(/\{Body\}\s*\n\s*\{addFriend\}\s*\n\s*\{call\}\s*\n\s*\{remove\}\s*\n\s*\{score\}\s*\n\s*\{armband\}/);
  });
});

describe("the classic lobby", () => {
  it("marks a seated player who is not in the app, off presence", () => {
    expect(lobby).toMatch(/offline:\s*\n\s*presenceLoaded &&\s*\n\s*p\.user_id !== user\?\.id &&\s*\n\s*\(p\.status as string\) !== "invited" &&\s*\n\s*!onlineInRoom\.has\(p\.user_id\),/);
  });

  /**
   * The row's tap no longer sends it.
   *
   * It did, and that is what made the decorative bell on the player's face a
   * spam button: the badge was `pointer-events-none`, so every tap aimed at
   * it fell through to the row and called the person again, silently (owner:
   * "i can click so many times on this bell and it sends many notifications
   * to the user and i see nothing"). Calling somebody back is the paper
   * plane's job alone now, and it goes through handleCallPlayer, which sends
   * once and then shows a tick.
   */
  it("and lets the host invite them back — from the paper plane, once", () => {
    expect(lobby).toMatch(/onCall: isHost && p\.user_id !== user\?\.id \? \(\) => void handleCallPlayer\(p\.user_id\) : undefined,/);
    expect(lobby).toMatch(/call: t\("lobby\.uInvite"\),/);
    // The send itself is unchanged — handleCallPlayer wraps it.
    expect(lobby).toMatch(/await handleInvitePlayer\(userId\);/);
  });
});
