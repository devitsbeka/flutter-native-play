import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every mission is advanced by an event, and something in the app has to fire
 * that event. Neither half is visible from the other, and when they disagree
 * the mission simply never completes — no error, no log, just a bar that never
 * moves. That is how "მოიწვიე მეგობარი თამაშში" came to be advanced only by
 * sending a friend *request*: inviting a friend you already had into a room,
 * which is exactly what the words ask for, fired nothing.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const MISSIONS = read("src/hooks/useMissions.ts");
const SRC_FILES = [
  "src/components/team/InviteFriendsModal.tsx",
  "src/components/team/AddFriendModal.tsx",
  "src/components/team/GameResultsScreenV2.tsx",
];

/** event -> mission ids, read out of EVENT_MISSIONS. */
function eventMissions(): Record<string, string[]> {
  const start = MISSIONS.indexOf("const EVENT_MISSIONS");
  const block = MISSIONS.slice(start, MISSIONS.indexOf("\n};", start));
  const out: Record<string, string[]> = {};
  for (const m of block.matchAll(/^\s*(\w+):\s*\[([^\]]*)\]/gm)) {
    out[m[1]] = [...m[2].matchAll(/"([\w]+)"/g)].map((x) => x[1]);
  }
  return out;
}

/** Every event name the app actually fires. */
function firedEvents(): Set<string> {
  const out = new Set<string>();
  for (const file of SRC_FILES) {
    for (const m of read(file).matchAll(/trackMissionEvent\("(\w+)"/g)) out.add(m[1]);
  }
  return out;
}

describe("missions and the events that advance them", () => {
  it("fires an event for every mission that can be completed by hand", () => {
    // The three friend missions are the ones a player completes deliberately
    // rather than by accumulating play, so a dead event is most visible here.
    const map = eventMissions();
    const fired = firedEvents();
    for (const event of ["friend_invited", "invited_to_room", "friend_game"]) {
      expect(map[event], `EVENT_MISSIONS has no ${event}`).toBeTruthy();
      expect(fired.has(event), `nothing calls trackMissionEvent("${event}")`).toBe(true);
    }
  });

  it("keeps room invites off the make-new-friends mission", () => {
    const map = eventMissions();
    // The "add {n} new friends" mission retired with the weekly pool.
    // friend_invited stays a wired event with nothing listening, so a future
    // friends mission plugs back in without re-plumbing the call sites — but
    // whatever listens must never be fed by invited_to_room: inviting someone
    // you are already friends with into a room is not making a friend.
    expect(map.friend_invited).toEqual([]);
    expect(map.invited_to_room ?? []).not.toContain("weekly_invite_friend");
  });

  it("advances the invite-to-a-game mission from the room invite", () => {
    expect(eventMissions().invited_to_room).toContain("invite_to_play");
    expect(read("src/components/team/InviteFriendsModal.tsx")).toContain(
      'trackMissionEvent("invited_to_room"',
    );
  });

  it("leaves no event mapped to missions that do not exist", () => {
    const ids = new Set([...MISSIONS.matchAll(/mission_id:\s*"([\w]+)"/g)].map((m) => m[1]));
    for (const [event, missions] of Object.entries(eventMissions())) {
      for (const id of missions) {
        expect(ids.has(id), `${event} points at unknown mission ${id}`).toBe(true);
      }
    }
  });
});
