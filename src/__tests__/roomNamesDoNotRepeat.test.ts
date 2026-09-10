import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOM_MOODS, ROOM_CREATURES, generateRoomIdentity, roomNameCandidates, type LangCode } from "@/utils/roomNameGenerator";

/**
 * Room names do not repeat on the list.
 *
 * Two "Noisy Vampires" sat on the Public list at once. Twelve moods by
 * thirty creatures is 360 names in a language, and a small list of dealt
 * names collides sooner than that sounds (owner: "we have two matching
 * names on public list, we need more random names to avoid repeated room
 * name"). Two answers: four times the names — twenty-four moods by sixty
 * creatures — and a deal that is told what is already on the list and
 * passes those over, on the client and in the edge function alike.
 */
const LANGS: LangCode[] = ["ka", "en", "fr", "de", "es", "it", "pt"];
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the tables", () => {
  it("carry twenty-four moods and sixty creatures", () => {
    for (const lang of LANGS) expect(ROOM_MOODS[lang], lang).toHaveLength(24);
    expect(ROOM_CREATURES).toHaveLength(60);
  });

  it("never deal the same words twice in a language", () => {
    for (const lang of LANGS) {
      expect(new Set(ROOM_MOODS[lang]).size, `${lang} moods`).toBe(24);
      const nouns = ROOM_CREATURES.map((c) => c[lang]);
      expect(new Set(nouns).size, `${lang} creatures`).toBe(nouns.length);
    }
  });

  it("give every language hundreds of names that fit the row", () => {
    for (const lang of LANGS) expect(roomNameCandidates(lang).length, lang).toBeGreaterThan(600);
  });

  it("dress the astronauts in the suit, since the astronaut itself is Astronomy's", () => {
    // A room may not wear a category's icon (roomIconsAreNotCategoryIcons).
    expect(ROOM_CREATURES.map((c) => c.icon)).not.toContain("astronaut");
    expect(ROOM_CREATURES.find((c) => c.en === "Astronauts")?.icon).toBe("astronaut-suit");
  });
});

describe("the deal", () => {
  it("passes over a name already on the list, whatever its case", () => {
    const all = roomNameCandidates("en").map((c) => c.name);
    const taken = all.slice(1);
    for (let i = 0; i < 20; i++) {
      expect(generateRoomIdentity("en", taken.map((n) => n.toUpperCase())).name).toBe(all[0]);
    }
  });

  it("falls back to any name only when every one is taken", () => {
    const all = roomNameCandidates("en").map((c) => c.name);
    expect(all).toContain(generateRoomIdentity("en", all).name);
  });

  it("is told what the Public list already holds, on the client", () => {
    const page = read("src/pages/TeamV2.tsx");
    expect(page).toMatch(/generateRoomIdentity\(readAppLanguage\(\), await fetchRoomNamesInUse\(\)\)/);
    const util = read("src/utils/roomNamesInUse.ts");
    expect(util).toMatch(/\.eq\("is_public", true\)\s*\.in\("status", \["waiting", "playing"\]\)/);
  });

  it("and in the edge function", () => {
    const edge = read("supabase/functions/generate-room-name/index.ts");
    expect(edge).toMatch(/async function fetchRoomNamesInUse\(supabase: SupabaseClient\)/);
    expect(edge).toMatch(/const takenNames = await fetchRoomNamesInUse\(supabase\);/);
    expect(edge).toMatch(/const fresh = candidates\.filter\(\(c\) => !avoid\.has\(c\.name\.toLowerCase\(\)\)\);/);
    expect(edge).not.toMatch(/generateThemedRoomName\(language\)[^,]/);
  });
});
