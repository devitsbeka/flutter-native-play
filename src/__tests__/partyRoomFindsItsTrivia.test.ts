/**
 * A party room is a party room whether the trivia built it or was queued
 * into it — and it never wears a name nobody chose.
 *
 * Two rooms, two ways the same bug showed up.
 *
 * Play-on-TV from the party card created a room with `user_trivia_id` set
 * correctly, but passed the literal string "My Trivia Party" as its
 * `room_name`. `isGeneratedRoomName` does not recognise that string — it is
 * not a mood-plus-creature pairing — so the lobby read it exactly like a
 * host's own rename and showed it verbatim, printing the brand as if it were
 * the party's title (owner: "this my trivia party has title 'tt' but when i
 * opened it - it shows 'my trivia party' as title too"). The fix is not to
 * special-case the string: it is to stop minting a fake name at all and deal
 * a real one, the same way every other room gets one.
 *
 * A trivia QUEUED into a room — round one added through the category picker,
 * rather than the room being created from the trivia — carries its
 * `user_trivia_id` on the QUEUE row, not the room's own column. The lobby's
 * `ownTriviaId` only ever read the room's column, so a room playing a party
 * this way was never recognised as one at all: no kicker, no dealt icon, and
 * whatever name the room happened to be dealt (a real mood-plus-creature
 * pairing, so `isGeneratedRoomName` was never the problem here) shown as-is
 * — "Crazy Zombies" over a party literally titled "Logos" (owner: "we don't
 * give these rooms — where players going to play my trivia party — random
 * names, host gives a name to that room").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const room = read("src/components/team/RoomLobbyV2.tsx");
const tab = read("src/components/social/MyTriviaTab.tsx");

describe("play-on-TV deals a real name instead of minting a fake one", () => {
  it("no longer passes the brand string as the room's name", () => {
    const call = tab.slice(tab.indexOf("const room = await createRoom("), tab.indexOf(");", tab.indexOf("const room = await createRoom(")));
    expect(call).not.toMatch(/"My Trivia Party", \/\/ room_name/);
    expect(call).toMatch(/generateRoomIdentity\(readAppLanguage\(\)\)\.name, \/\/ room_name/);
  });

  it("imports the same generator every other room creation path uses", () => {
    expect(tab).toMatch(/import \{ generateRoomIdentity \} from "@\/utils\/roomNameGenerator";/);
    expect(tab).toMatch(/import \{ readAppLanguage \} from "@\/utils\/appLanguage";/);
  });
});

describe("ownTriviaId also finds a trivia queued into round one", () => {
  it("falls back to the queue's head, but only when nothing already holds round one", () => {
    // Mirrors heldRound's own condition below: a category_id in that slot
    // means round one is a category, and the queue's head must not override
    // it just because it happens to carry a user_trivia_id of its own.
    expect(room).toMatch(
      /const ownTriviaId =\s*\n\s*currentRoom\?\.user_trivia_id\s*\n\s*\?\? \(currentRoom\?\.category_id \? null : queue\[0\]\?\.user_trivia_id\)\s*\n\s*\?\? null;/,
    );
  });

  it("is declared after the queue exists, not before it", () => {
    const queueIdx = room.indexOf("useRoomCategoryQueue(currentRoom?.id || null)");
    const ownIdx = room.indexOf("const ownTriviaId =");
    expect(queueIdx).toBeGreaterThan(-1);
    expect(ownIdx).toBeGreaterThan(queueIdx);
  });

  it("and heldRound's own condition is exactly what ownTriviaId mirrors", () => {
    expect(room).toMatch(
      /const heldRound = \(currentRoom\.category_id \|\| currentRoom\.user_trivia_id\)/,
    );
  });
});
