import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { categoryPlayableIn, filterCategoriesForLanguage } from "@/utils/languageCategoryFilter";

const read = (p: string) => readFileSync(p, "utf8");

/**
 * A room keeps the round it was given, and the host's country can change
 * after that. An account on Georgia set a room on Georgian Cuisine, moved to
 * the USA, and came back to a lobby holding a round with no English
 * questions in it: Start failed with "questions not found" and nothing said
 * why (owner: "Georgian cuisine should see only users who picked Georgia in
 * settings, we need strict rules to avoid issues like that").
 *
 * The pickers already filter (languageCategoryFilter.test.ts). This pins the
 * rest of the rule: one predicate, the facts hook that answers it for a
 * stored round, the lobby that refuses to start one, and the public list
 * that does not offer a room built on one.
 */
describe("one rule for a category and a language", () => {
  it("is the predicate the pickers filter with", () => {
    expect(categoryPlayableIn({ is_language_specific: true, language: "ka" }, "en")).toBe(false);
    expect(categoryPlayableIn({ is_language_specific: true, language: "ka" }, "ka")).toBe(true);
    expect(categoryPlayableIn({ is_language_specific: false, language: "ka" }, "en")).toBe(true);
    expect(categoryPlayableIn({ is_language_specific: null, language: null }, "de")).toBe(true);
    const util = read("src/utils/languageCategoryFilter.ts");
    expect(util).toMatch(/return rows\.filter\(\(r\) => categoryPlayableIn\(r, lang\)\);/);
    expect(filterCategoriesForLanguage([{ id: 1, is_language_specific: true, language: "ka" }], "en")).toEqual([]);
  });

  it("the facts hook answers it for a stored round, by slug or uuid, and says nothing while loading", () => {
    const hook = read("src/hooks/useCategoryDisplay.ts");
    expect(hook).toMatch(/\.select\("id, category_id, name, icon_slug, is_language_specific, language"\)/);
    expect(hook).toMatch(/byUuid\.set\(row\.id, facts\);/);
    expect(hook).toMatch(/const facts = cached\?\.get\(ref\) \?\? cachedByUuid\?\.get\(ref\);\s*\n\s*if \(!facts\) return null;/);
    expect(hook).toMatch(/return categoryPlayableIn\(\{ is_language_specific: facts\.isLanguageSpecific, language: facts\.language \}, lang\);/);
    expect(hook).toMatch(/return \{ iconSlugFor, nameFor, playableFor, ready \};/);
  });
});

describe("the lobby", () => {
  const lobby = read("src/components/team/RoomLobbyV2.tsx");

  it("names the round it cannot start, held or queued, and only when the facts say so", () => {
    expect(lobby).toMatch(/const held = currentRoom\.user_trivia_id \? null : currentRoom\.category_id;/);
    expect(lobby).toMatch(/if \(held && held !== "__mixed__" && playableFor\(held\) === false\) \{/);
    expect(lobby).toMatch(/\(item\) => item\.source_type === "category" && item\.category_id && playableFor\(item\.category_id\) === false,/);
    expect(lobby).toMatch(/unplayableRoundRef\.current = unplayableRound;/);
  });

  it("disables Start with the reason under it, and refuses the picker's own start too", () => {
    expect(lobby).toMatch(/\(awaitingPlayers && !offerCreate\) \|\| !!unplayableRound,/);
    expect(lobby).toMatch(/caption: unplayableRound\s*\n\s*\? t\("extra\.rlRoundNotInLanguage", \{ name: unplayableRound \}\)/);
    expect(lobby).toMatch(/if \(unplayableRoundRef\.current\) \{\s*\n\s*toast\.error\(t\("extra\.rlRoundNotInLanguage", \{ name: unplayableRoundRef\.current \}\)\);\s*\n\s*return;/);
  });
});

describe("the public list", () => {
  it("does not offer a room whose rounds the viewer could not play", () => {
    const section = read("src/components/team/PublicRoomsSection.tsx");
    expect(section).toMatch(/playableFor\(idForRoundCategory\(round\.name\)\) !== false,/);
    expect(section).toMatch(/round\.source_type !== "category" \|\|\s*\n\s*!round\.name \|\|\s*\n\s*MIXED_LABELS\.has\(round\.name\) \|\|/);
    expect(section).toMatch(/\(r\) => !hiddenIds\.has\(r\.host_user_id\) && roundsPlayableHere\(r\),/);
  });
});

describe("the words", () => {
  it("are in all seven, and carry the round's name", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${lang}.ts`);
      expect(src, lang).toMatch(/\n\s+rlRoundNotInLanguage: "\{name\}[^"]+",/);
    }
  });
});
