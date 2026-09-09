/**
 * A party room's card says what it is, not what the trivia is called.
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
 * The room's own name is untouched — this only replaces the line under it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isGeneratedRoomName } from "@/utils/roomNameGenerator";
import { triviaDisplayTitle } from "@/utils/triviaTitle";

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

  it("the party trivia's own title rides along too, for the moment room_name is blank", () => {
    // A party room's room_name is deliberately left blank (no dealt name),
    // so the card needs the trivia's own saved title from somewhere — the
    // same source RoomLobbyV2's heading reads via triviaDisplayTitle.
    // Fetching it here, once per room list, is what keeps the two screens
    // agreeing without a second round trip once the room is open.
    expect(rooms).toMatch(/party_trivia_title: string \| null;/);
    expect(rooms).toMatch(
      /party_trivia_title: room\.user_trivia_id \? \(partyTriviaTitleMap\.get\(room\.user_trivia_id\) \?\? null\) : null,/,
    );
    expect(rooms).toMatch(/\.from\("user_quiz_posts"\)\s*\n\s*\.select\("id, title, subject"\)/);
    // Only a party trivia's own title counts — a user_trivia_id pointing
    // anywhere else is left unmapped rather than shown as if it were one.
    expect(rooms).toMatch(/if \(tv\.subject === "personal"\) partyTriviaTitleMap\.set\(tv\.id, tv\.title \?\? ""\);/);
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

  it("and an ordinary room's own name is untouched — room_name still comes first", () => {
    expect(
      (grid.match(
        /: room\.room_name \|\| lounge\?\.label \|\| t\("extra\.gameRoomLabel"\);/g,
      ) ?? []).length,
    ).toBe(2);
  });
});

/**
 * A party room's OWN name falls back to the trivia's own title, not a
 * dealt one — and only "Untitled" once that title is blank too.
 *
 * Play-on-TV deals the room a real generated name now (a separate fix), so
 * every fresh party room wears a mood-and-creature pairing until the host
 * changes it — "Angry Elephants" as the big heading a card leads with. That
 * is exactly the random name this screen is supposed to be free of (owner:
 * "my trivia party should have name: Untitled... remove that random names
 * from my trivia party rooms").
 *
 * The card used to fall straight to a flat "Untitled" the moment room_name
 * was blank or dealt — never reading the trivia's own saved title, which
 * is exactly what the lobby you land in a tap later DOES read (via
 * triviaDisplayTitle), so a room named "tt" by its host showed "tt" once
 * opened but "Untitled" on the card that led there.
 */
describe("a party room's own name falls back to its trivia's title, not a dealt one", () => {
  it("in both card components", () => {
    expect(
      (grid.match(
        /const displayName = isPartyRoom\s*\n\s*\? \(!room\.room_name \|\| isGeneratedRoomName\(room\.room_name\)\s*\n\s*\? triviaDisplayTitle\(room\.party_trivia_title, t\)\s*\n\s*: room\.room_name\)\s*\n\s*: room\.room_name \|\| lounge\?\.label \|\| t\("extra\.gameRoomLabel"\);/g,
      ) ?? []).length,
    ).toBe(2);
  });

  it("recognising the client's own dealt vocabulary, not just an empty name", () => {
    expect(grid).toMatch(/import \{ isGeneratedRoomName \} from "@\/utils\/roomNameGenerator";/);
  });

  it("reading the trivia's title the same way the lobby heading does", () => {
    expect(grid).toMatch(/import \{ triviaDisplayTitle \} from "@\/utils\/triviaTitle";/);
    // Only blank (never named) or the stored brand default falls all the
    // way to "Untitled" — a host-typed trivia title shows as itself, on
    // the card exactly as it does once the room is open.
    expect(triviaDisplayTitle(null, (k) => k)).toBe("extra.triviaUntitled");
    expect(triviaDisplayTitle("", (k) => k)).toBe("extra.triviaUntitled");
    expect(triviaDisplayTitle("My Trivia Party", (k) => k)).toBe("extra.triviaUntitled");
    expect(triviaDisplayTitle("tt", (k) => k)).toBe("tt");
  });

  it("but a name the host actually typed still shows, once it exists", () => {
    // A typed name is not one of the pairings this generator deals, so it
    // falls through to room.room_name unchanged.
    expect(isGeneratedRoomName("Beka's birthday")).toBe(false);
  });
});
