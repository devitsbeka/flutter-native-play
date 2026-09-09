/**
 * Opening Activity from a lobby and pressing Back lands back in that lobby.
 *
 * The lobby's bell opens the Activity page, whose Back was history's -1 —
 * not reliably the lobby the player was standing in (owner: "when i click
 * activity to see notifications in lobby i shouldn't leave the lobby, make
 * sure we stay in lobby when i click back button to close activity page").
 *
 * So the bell hands the room's own route along in navigation state, and
 * the page's Back goes there — or, failing the state, to the room still
 * held in context — replacing the Activity entry. /team?room=CODE shows the
 * lobby when the room is still held and re-enters it when it is not, so
 * the answer is the same either way.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const activity = read("src/pages/Notifications.tsx");

describe("the lobby's bell", () => {
  it("opens Activity with the room's route to come back to", () => {
    expect(lobby).toMatch(/onBell=\{\(\) => navigate\("\/notifications", \{ state: \{ backTo: routeForRoom\(currentRoom\) \} \}\)\}/);
  });
});

describe("the Activity page's Back", () => {
  it("returns to the room named by the state, or the one still held, replacing itself", () => {
    expect(activity).toMatch(/const \{ currentRoom, phase: roomPhase \} = useMultiplayerV2\(\);/);
    expect(activity).toMatch(/const backToRoom =\s*\n\s*\(location\.state as \{ backTo\?: string \} \| null\)\?\.backTo \?\?\s*\n\s*\(currentRoom && roomPhase !== "idle" \? routeForRoom\(currentRoom\) : null\);/);
    expect(activity).toMatch(/onBack=\{backToRoom \? \(\) => navigate\(backToRoom, \{ replace: true \}\) : undefined\}/);
  });

  it("and is history's Back everywhere else", () => {
    // No room, no state: PageHeader's own -1 (or home when this is the
    // first in-app entry) is untouched.
    expect(activity).not.toMatch(/onBack=\{\(\) => navigate\(-1\)\}/);
  });
});
