/**
 * A party room's card says what it is, not what the trivia is called —
 * and its own name is a room name like any other's.
 *
 * The line under a room's own name is a category line everywhere else on
 * this card — "Disney Movies", "Mixed" — so a room built on a MyTrivia Party
 * showed the trivia's raw title there too: "tt", the exact same text that
 * would sit in the room's own name field if the host had typed it, on the
 * same card, one line apart. Two different things were saying the same kind
 * of thing (owner: "instead tt we show My Trivia Party and above name what
 * host choose to name their room, like we have now, replace 'tt' to always
 * show My Trivia party").
 *
 * The room's own name went through its own back-and-forth: a "party rooms
 * never wear a dealt name, only Untitled or the trivia's own title" rule
 * was tried and then dropped (owner: "we don't need 'untitled', use random
 * names for my trivia party rooms as we do on other rooms") — a party
 * room's own name is exactly what room.room_name says, dealt or typed,
 * with no party-specific branch at all.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const grid = read("src/components/team/MyRoomsSection.tsx");
const rooms = read("src/hooks/useMyRooms.ts");

describe("the card knows it is playing a party without a second query", () => {
  it("user_trivia_id rides along on every fetched room", () => {
    expect(rooms).toMatch(/user_trivia_id: string \| null;/);
    expect(rooms).toMatch(/user_trivia_id: room\.user_trivia_id \?\? null,/);
  });

  it("both cards derive isPartyRoom from it", () => {
    expect((grid.match(/const isPartyRoom = !!room\.user_trivia_id;/g) ?? []).length).toBe(2);
  });
});

describe("the line under the room's name", () => {
  it("says My Trivia Party for a party room, in both card components", () => {
    expect(
      (grid.match(
        /\{isPartyRoom \? t\("extra\.myTriviaPartyLabel"\) : room\.category_name \? localizeCategory\(room\.category_name\) : lounge!\.label\}/g,
      ) ?? []).length,
    ).toBe(2);
  });

  it("and shows even when category_name happens to be empty", () => {
    expect(
      (grid.match(/\{\(isPartyRoom \|\| room\.category_name \|\| \(lounge && room\.room_name\)\) && \(/g) ?? [])
        .length,
    ).toBe(2);
  });
});

/**
 * A party room's own name is a room name, no party-specific branch.
 *
 * Two things were tried here and both were walked back: a dealt name at
 * creation that the card then hid behind "Untitled" (owner: "my trivia
 * party should have name: Untitled... remove that random names"), and then
 * an "Untitled, or the trivia's own title" rule in place of the dealt name
 * (owner, this time the other way: "we don't need 'untitled', use random
 * names for my trivia party rooms as we do on other rooms"). What is left
 * is the simplest reading: room.room_name is the room's name, dealt or
 * typed, exactly like every other room on this list.
 */
describe("a party room's own name is just room.room_name, like any other room's", () => {
  it("in both card components — one unconditional line, no isPartyRoom branch", () => {
    expect(
      (grid.match(
        /const displayName = room\.room_name \|\| lounge\?\.label \|\| t\("extra\.gameRoomLabel"\);/g,
      ) ?? []).length,
    ).toBe(2);
  });

  it("carries no leftover party-only name logic", () => {
    expect(grid).not.toMatch(/isGeneratedRoomName/);
    expect(grid).not.toMatch(/triviaDisplayTitle/);
    expect(rooms).not.toMatch(/party_trivia_title/);
  });
});
