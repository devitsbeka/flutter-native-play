/**
 * A party's room wears a dealt face and a dealt name, like any other room.
 *
 * This went back and forth: a room built on a MyTrivia Party was first dealt
 * a creature off the crest pool and a mood-plus-creature name, like every
 * other room, which named neither the party nor the kind of thing it was
 * (owner: "we should show one of the my trivia party icons here instead
 * random icons and random name for room, we should show name user provided
 * for their trivia party or untitled"). That shipped as a fixed set of four
 * house-party icons for the room's own face and the trivia's own title (or
 * Untitled) for its own name — and was itself walked back once it was live
 * (owner: "we had 4 icons for my trivia party room, we don't need them
 * anymore... we need random icons and room names here... show room's icon
 * and room's name how we used to show - random icon and name"). What is
 * left is the room the way it started: a dealt crest, a dealt name, no
 * party-specific override for either. Only the category CHIP — what the
 * room plays, not what it's called or what it looks like — still names the
 * trivia; see the "what the lobby does with it" block below.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { isGeneratedRoomName, composeRoomName, ROOM_MOODS, ROOM_CREATURES } from "@/utils/roomNameGenerator";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const room = read("src/components/team/RoomLobbyV2.tsx");
const partyCoverIcon = read("src/utils/partyCoverIcon.ts");

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

/**
 * The room-face function itself is gone — it has no callers left.
 *
 * `partyCoverIcons`/`PARTY_COVER_ICON_SLUGS` stay: the TRIVIA CARD's own
 * banner (in MyTriviaTab, see partyCoverIcon.test.ts) still deals one of
 * the four house-party icons when the trivia has no cover of its own —
 * that ask was never walked back, only the ROOM's face was.
 */
describe("the room-face function is gone, the trivia-card one is not", () => {
  it("partyRoomIconUrl no longer exists", () => {
    expect(partyCoverIcon).not.toMatch(/export function partyRoomIconUrl/);
  });

  it("but the trivia card's own four-icon deal is untouched", () => {
    expect(partyCoverIcon).toMatch(/export function partyCoverIcons/);
    expect(partyCoverIcon).toMatch(/export const PARTY_COVER_ICON_SLUGS/);
  });
});

describe("what the lobby does with it", () => {
  it("reads the party behind the room, and only calls a party a party", () => {
    expect(room).toMatch(/\.from\("user_quiz_posts"\)\s*\n\s*\.select\("title, subject"\)/);
    expect(room).toMatch(/data\?\.subject === "personal"/);
  });

  it("wears the same dealt crest any other room does — no party-only face", () => {
    expect(room).toMatch(
      /const roomFace = currentRoom\.room_icon \?\? dealtRoomIcon\(currentRoom\.id, iconPool\);/,
    );
    expect(room).not.toMatch(/partyRoomIconUrl/);
  });

  it("the room's own name carries no party-only branch — room.room_name, like any other room", () => {
    // Tried the other way round too (party name only while the room still
    // wore a dealt one, else Untitled) and walked back (owner: "we don't
    // need 'untitled', use random names for my trivia party rooms as we do
    // on other rooms") — a party room's heading is exactly what every other
    // room's is.
    expect(room).toMatch(/const roomName = currentRoom\.room_name \|\| t\("extra\.gameRoomDefault"\);/);
  });

  it("the chip still names the trivia, Untitled included for one that was never named", () => {
    // The heading above is just the room's name now; what the chip names —
    // the round being played — is still the trivia's own title, the same
    // triviaDisplayTitle fallback everywhere else a trivia's own name is
    // shown.
    expect(room).toMatch(/triviaDisplayTitle\(partyTitle, t\)/);
  });
});

/**
 * The rename sheet's own auto-namer is back on for a party room too.
 *
 * A party room's sheet briefly turned it off (`autoName={!isPartyRoom}`),
 * on the reasoning that tapping through icons kept overwriting "Untitled"
 * (or the trivia's own title) with a fresh AI-dealt name. That traded away
 * the dealt name entirely — a fresh party room now stays untitled forever
 * unless the host types something — so a party room's rename sheet deals
 * one exactly like every other room's does (owner: "bring back random
 * names"). It still never overwrites a name typed in THIS sheet session —
 * `hasManuallyEditedName` guards that regardless of `autoName`.
 */
describe("the icon picker's own namer is on for every room, party included", () => {
  it("carries no party-only override", () => {
    expect(room).not.toMatch(/autoName=/);
  });
});
