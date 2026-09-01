/**
 * The room-name tables live in two places and must not drift.
 *
 * generate-room-name (Deno, deployed through Lovable) is the live source; the
 * client keeps the same tables so a room still gets a name when the function
 * cannot be reached. They cannot import each other, so this compares them —
 * and, because it parses the edge file, it also notices if that copy stops
 * being valid at all.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROOM_MOODS,
  ROOM_CREATURES,
  composeRoomName,
  generateRoomIdentity,
  maxRoomNameLength,
  roomNameCandidates,
  type LangCode,
} from "@/utils/roomNameGenerator";

const LANGS: LangCode[] = ["ka", "en", "fr", "de", "es", "it", "pt"];

const edge = readFileSync(
  join(process.cwd(), "supabase/functions/generate-room-name/index.ts"),
  "utf8",
);

/** The text of a top-level `const NAME ... = ...;` declaration. */
function block(source: string, name: string): string {
  const start = source.indexOf(`const ${name}`);
  expect(start, `${name} missing from the edge function`).toBeGreaterThan(-1);
  // Records close with "};", the creature array with "];".
  const ends = ["\n};", "\n];"].map((e) => source.indexOf(e, start)).filter((i) => i > start);
  expect(ends.length, `${name} is not a closed declaration`).toBeGreaterThan(0);
  return source.slice(start, Math.min(...ends));
}

describe("the edge function and the client agree", () => {
  it("carries the same moods, word for word", () => {
    for (const lang of LANGS) {
      for (const mood of ROOM_MOODS[lang]) {
        expect(block(edge, "ROOM_MOODS"), `${lang} mood "${mood}"`).toContain(mood);
      }
    }
  });

  it("carries the same creatures and icon slugs", () => {
    const creatures = block(edge, "ROOM_CREATURES");
    for (const c of ROOM_CREATURES) {
      expect(creatures, `icon ${c.icon}`).toContain(`"${c.icon}"`);
      for (const lang of LANGS) expect(creatures, `${lang} ${c[lang]}`).toContain(c[lang]);
    }
  });

  it("keeps the same word order and length limits", () => {
    expect(edge).toContain(`const ADJECTIVE_FIRST: LangCode[] = ["ka", "en", "de"];`);
    expect(edge).toContain(`const MAX_NAME_LENGTH_KA = ${maxRoomNameLength("ka")}`);
    expect(edge).toContain(`const MAX_NAME_LENGTH_LATIN = ${maxRoomNameLength("en")}`);
  });
});

describe("generated room names", () => {
  it("puts the adjective where the language wants it", () => {
    expect(composeRoomName("Sleepy", "Dragons", "en")).toBe("Sleepy Dragons");
    expect(composeRoomName("მძინარე", "დრაკონები", "ka")).toBe("მძინარე დრაკონები");
    expect(composeRoomName("Verschlafene", "Drachen", "de")).toBe("Verschlafene Drachen");
    // Romance languages read noun first — "Endormis Dragons" is machine output.
    expect(composeRoomName("Endormis", "Dragons", "fr")).toBe("Dragons Endormis");
    expect(composeRoomName("Dormilones", "Dragones", "es")).toBe("Dragones Dormilones");
    expect(composeRoomName("Assonnati", "Draghi", "it")).toBe("Draghi Assonnati");
    expect(composeRoomName("Sonolentos", "Dragões", "pt")).toBe("Dragões Sonolentos");
  });

  it.each(LANGS)("%s never generates a name too wide for the row", (lang) => {
    const tooLong = roomNameCandidates(lang).filter((c) => c.name.length > maxRoomNameLength(lang));
    expect(tooLong).toEqual([]);
  });

  it.each(LANGS)("%s still has plenty of names after the length filter", (lang) => {
    // Georgian loses the most to the 18-character row; it must not collapse
    // to a handful of repeats.
    expect(roomNameCandidates(lang).length).toBeGreaterThan(100);
  });

  it("hands back an icon with every name", () => {
    for (let i = 0; i < 200; i++) {
      const { name, icon } = generateRoomIdentity("ka");
      expect(name.trim()).not.toBe("");
      expect(icon).toMatch(/^[a-z-]+$/);
    }
  });

  it("does not repeat itself the way a 120-name list did", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(generateRoomIdentity("en").name);
    expect(seen.size).toBeGreaterThan(120);
  });
});
