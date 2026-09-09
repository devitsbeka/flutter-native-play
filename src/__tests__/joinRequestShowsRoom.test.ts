/**
 * The doorstep names the room.
 *
 * "Britney - Join request - Accept / Decline" said who was asking but not
 * where. The gate is app-wide - a host answers from the home screen, from
 * another room, mid-game - and one with two rooms open was deciding about a
 * door they could not see (owner: "show more about the room... room name,
 * with what category, more clear picture what this modal is about").
 *
 * The card now carries the room's face, its name, what it is playing and
 * how full it is, and the line under the asker's name says what they want.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const hook = read("src/hooks/useRoomJoinRequests.ts");
const gate = read("src/components/team/JoinRequestGate.tsx");

describe("a request carries its room", () => {
  it("name, face, category and seats, on the shared request type", () => {
    expect(hook).toMatch(/room_name: string \| null;\s*room_icon: string \| null;\s*category_name: string \| null;\s*seated: number;\s*max_players: number \| null;/);
    expect(hook).toMatch(/const ROOM_CONTEXT_COLUMNS = "room_name, room_icon, category_name, max_players";/);
  });

  it("from both doorsteps - the app-wide one and the lobby's own", () => {
    // App-wide: the rooms query it already ran, widened, plus one seat count.
    expect(hook).toMatch(/\.select\(`id, room_code, game_type_key, game_mode, host_user_id, \$\{ROOM_CONTEXT_COLUMNS\}`\)/);
    // In the lobby: the one room, by id.
    expect(hook).toMatch(/\.from\("game_rooms"\)\.select\(ROOM_CONTEXT_COLUMNS\)\.eq\("id", roomId\)\.maybeSingle\(\)/);
    expect(hook).toMatch(/seated: seated\.get\(r\.room_id\) \?\? 0,/);
  });
});

describe("the card says where", () => {
  it("draws the room under the asker, before the arena's side picker", () => {
    expect(gate).toMatch(/export function JoinRequestRoomCard\(/);
    const card = gate.indexOf("<JoinRequestRoomCard\n          roomId={next.room_id}");
    expect(card).toBeGreaterThan(-1);
    expect(card).toBeLessThan(gate.indexOf("{hostTeam && ("));
  });

  it("the room's own face, else the dealt one - never bare", () => {
    expect(gate).toMatch(/const face = roomIcon \?\? dealtRoomIcon\(roomId, iconPool\);/);
  });

  it("the category in the reader's language, and a random room says so", () => {
    expect(gate).toMatch(/localizeCategory\(categoryName\) \?\? categoryName \?\? t\("extra\.cpRandomTitle"\)/);
  });

  it("seats as the Public card counts them", () => {
    expect(gate).toMatch(/\{seated\}\/\{maxPlayers\}/);
  });
});

describe("the line under the name says what they want", () => {
  it("in every language, as a clause that follows the name", () => {
    const expected: Record<string, RegExp> = {
      en: /joinRequestBody: "wants to join your room",/,
      ka: /joinRequestBody: "სურს შენს ოთახში შემოსვლა",/,
      de: /joinRequestBody: "möchte deinem Raum beitreten",/,
      es: /joinRequestBody: "quiere unirse a tu sala",/,
      fr: /joinRequestBody: "veut rejoindre ta salle",/,
      it: /joinRequestBody: "vuole entrare nella tua stanza",/,
      pt: /joinRequestBody: "quer entrar na tua sala",/,
    };
    for (const [lang, re] of Object.entries(expected)) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(re);
    }
  });
});
