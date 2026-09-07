/**
 * Every round name is said in the reader's language, and no category is
 * offered outside the language it belongs to.
 *
 * Two reports, one screenshot: a round list showing the SAME category twice,
 * once as "გამოიცანი ვარსკვლავი" and once as "Guess the Celebrity", after
 * the owner changed their country in settings; and a Georgian History
 * category reached while the country was the USA.
 *
 * They have different causes.
 *
 * The first is a snapshot: `game_rooms.category_name` and
 * `room_category_queue.category_name` are written in whatever language the
 * person who added the round was reading, and the lobby drew them as
 * stored. useLocalizedCategoryName maps a stored name in any of the app's
 * languages back to the category and out to the reader's — the lobby chip
 * used it for the QUEUE and not for the room's own round, and the round
 * list used it for neither.
 *
 * The second is a hole in the language rule. filterCategoriesForLanguage
 * keeps a language-specific category out of every picker, but the random
 * question pool selected every active category and filtered only the
 * QUESTIONS by language — and a few of those categories carry a handful of
 * translated questions (georgian_history has 196 in Georgian and 2 in
 * English), so an English random round could land on one.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("a round is named in the reader's language", () => {
  const modal = read("src/components/team/RoundOrderModal.tsx");
  const lobby = read("src/components/team/RoomLobbyV2.tsx");

  it("the round list resolves every row's stored name", () => {
    expect(modal).toMatch(/useLocalizedCategoryName/);
    expect(modal).toMatch(/const localize = useLocalizedCategoryName\(\);/);
    // Held round and queue row alike go through it, with the stored string
    // as the fallback rather than the value.
    expect(modal).toMatch(
      /const stored = isHeld\(entry\) \? entry\.name : entry\.category_name;\s*\n\s*const name = localize\(stored\) \?\? stored;/,
    );
    expect(modal).toMatch(/localize=\{localize\}/);
  });

  it("the lobby chip resolves the room's own round, not just the queue", () => {
    // It already translated the queue's head; the held round was drawn raw.
    expect(lobby).toMatch(
      /name:\s*\n\s*localizeQueueCategory\(currentRoom\.category_name\)\s*\n\s*\|\| currentRoom\.category_name/,
    );
  });

  it("so do the room list and the invite card", () => {
    const hub = read("src/pages/OnlineGameHub.tsx");
    const invite = read("src/pages/InvitePage.tsx");
    expect(hub).toMatch(/localizeCategory\(room\.category_name\) \?\? room\.category_name/);
    expect(invite).toMatch(/localizeCategory\(preview\.category_name\) \?\? preview\.category_name/);
    for (const src of [hub, invite]) {
      expect(src).toMatch(/useLocalizedCategoryName/);
    }
  });
});

describe("a language-specific category stays in its language", () => {
  const service = read("src/services/questionService.ts");

  it("the random question pool applies the same filter every picker does", () => {
    expect(service).toMatch(/import \{ filterCategoriesForLanguage \}/);
    expect(service).toMatch(
      /const categories = filterCategoriesForLanguage\(allCategories \|\| \[\], language\);/,
    );
    // The filter needs the two columns to read, so the select must ask for
    // them — without these every row looks universal and nothing is filtered.
    expect(service).toMatch(
      /\.select\('id, name, category_id, icon_slug, is_language_specific, language'\)/,
    );
  });

  it("and the pool is filtered before it is checked for emptiness", () => {
    const poolAt = service.indexOf("const categories = filterCategoriesForLanguage");
    const emptyAt = service.indexOf("if (!categories || categories.length === 0)", poolAt);
    expect(poolAt).toBeGreaterThan(-1);
    expect(emptyAt).toBeGreaterThan(poolAt);
  });
});
