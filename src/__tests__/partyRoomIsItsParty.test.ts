/**
 * A party's room is that party — not a parrot called "Cheerful Rabbits".
 *
 * A room built on a MyTrivia Party was dealt a creature off the crest pool
 * and a mood-plus-creature name, like every other room. So the screen you
 * land on after making a party named neither the party nor the kind of thing
 * it was (owner: "we should show one of the my trivia party icons here
 * instead random icons and random name for room, we should show name user
 * provided for their trivia party or untitled").
 *
 * Two things had to be true for that to be fixable:
 *
 *  - The room row says WHICH trivia it plays but not whether that trivia is
 *    a party, and the four icons belong to parties. One row is read for it.
 *  - Every room is created with a generated name, so "has the host named
 *    this room?" cannot be answered by asking whether a name exists. It is
 *    answered by asking whether the name is one the generator could have
 *    dealt — which is what leaves a host's own rename alone.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isGeneratedRoomName, composeRoomName, ROOM_MOODS, ROOM_CREATURES } from "@/utils/roomNameGenerator";
import { partyRoomIconUrl, PARTY_COVER_ICON_SLUGS } from "@/utils/partyCoverIcon";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const room = read("src/components/team/RoomLobbyV2.tsx");

describe("telling a dealt name from a typed one", () => {
  it("knows the names it deals, in every language", () => {
    expect(isGeneratedRoomName(composeRoomName(ROOM_MOODS.en[0], ROOM_CREATURES[0].en, "en"))).toBe(true);
    expect(isGeneratedRoomName(composeRoomName(ROOM_MOODS.ka[0], ROOM_CREATURES[0].ka, "ka"))).toBe(true);
    // Word order is per language: French puts the adjective after the noun,
    // and the English arrangement of French words is not a name it deals.
    expect(isGeneratedRoomName(composeRoomName(ROOM_MOODS.fr[0], ROOM_CREATURES[0].fr, "fr"))).toBe(true);
    expect(isGeneratedRoomName(`${ROOM_MOODS.fr[0]} ${ROOM_CREATURES[0].fr}`)).toBe(false);
  });

  it("and a name somebody typed is not one of them", () => {
    expect(isGeneratedRoomName("Beka's birthday")).toBe(false);
    expect(isGeneratedRoomName("Sherlock")).toBe(false);
    expect(isGeneratedRoomName("")).toBe(false);
    expect(isGeneratedRoomName(null)).toBe(false);
    expect(isGeneratedRoomName("   ")).toBe(false);
  });

  it("reads a room's stored name, spaces and all", () => {
    const dealt = composeRoomName(ROOM_MOODS.en[4], ROOM_CREATURES[1].en, "en");
    expect(isGeneratedRoomName(`  ${dealt}  `)).toBe(true);
  });
});

describe("the face a party room wears", () => {
  it("is one of the four its card wears", () => {
    const url = partyRoomIconUrl("11111111-2222-3333-4444-555555555555");
    expect(PARTY_COVER_ICON_SLUGS.some((slug) => url.endsWith(`/${slug}.png`))).toBe(true);
  });

  it("and is the same one every time, on every screen", () => {
    const id = "abcdef01-2345-6789-abcd-ef0123456789";
    expect(partyRoomIconUrl(id)).toBe(partyRoomIconUrl(id));
  });

  it("with different rooms not all landing on the same icon", () => {
    const seen = new Set(
      Array.from({ length: 40 }, (_, i) => partyRoomIconUrl(`room-${i}`)),
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("what the lobby does with it", () => {
  it("reads the party behind the room, and only calls a party a party", () => {
    expect(room).toMatch(/\.from\("user_quiz_posts"\)\s*\n\s*\.select\("title, subject"\)/);
    expect(room).toMatch(/data\?\.subject === "personal"/);
  });

  it("wears a party icon over the dealt crest, and under the host's own", () => {
    expect(room).toMatch(
      /currentRoom\.room_icon\s*\n\s*\?\? \(isPartyRoom \? partyRoomIconUrl\(currentRoom\.id\) : null\)\s*\n\s*\?\? dealtRoomIcon/,
    );
  });

  it("takes the party's name only while the room still wears a dealt one", () => {
    expect(room).toMatch(
      /isPartyRoom && isGeneratedRoomName\(currentRoom\.room_name\)\s*\n\s*\? triviaDisplayTitle\(partyTitle, t\)\s*\n\s*: currentRoom\.room_name \|\| t\("extra\.gameRoomDefault"\)/,
    );
  });

  it("and an unnamed party is Untitled, not the brand", () => {
    // The save stores `title || "MyTrivia Party"`, so the room would
    // otherwise be called the product.
    expect(room).toMatch(/triviaDisplayTitle\(partyTitle, t\)/);
  });
});
