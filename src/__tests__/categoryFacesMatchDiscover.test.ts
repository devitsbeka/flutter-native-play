/**
 * A round wears the same face Discover gives its category.
 *
 * The room preview listed "Guess the Logo" beside a magnifying glass — the
 * category's library glyph — while Discover shows the logo tile: bundled
 * art for the six picture-guess categories, keyed by the category's ASCII
 * id (CategoryArtwork). Rooms and queue rows carry the round's NAME and
 * nothing else, so the id is now found the way the icon and the
 * translation are (useCategoryIdByName), and every place a round's icon is
 * drawn asks CategoryArtwork with it (owner: "this is not 'guess the logo'
 * icon, why you show this icon, check we show exact same icons what we
 * have in Discover page on our categories for consistency").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const names = read("src/utils/categoryDisplayName.ts");
const sheet = read("src/components/team/RoomPreviewSheet.tsx");
const pub = read("src/components/team/PublicRoomsSection.tsx");
const lobbyUi = read("src/components/lobby/UniversalLobby.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const summary = read("src/components/team/MatchSummarySheet.tsx");
const order = read("src/components/team/RoundOrderModal.tsx");

describe("the id is found the way the icon is", () => {
  it("off the same two queries, for base and translated names alike", () => {
    expect(names).toMatch(/select\("id, category_id, name, icon_slug"\)/);
    expect(names).toMatch(/ids: Map<string, string>;/);
    expect(names).toMatch(/if \(c\.category_id\) idOf\.set\(c\.id, c\.category_id\);/);
    expect(names).toMatch(/const id = idOf\.get\(t\.category_id\);\s*\n\s*if \(id\) ids\.set\(t\.name, id\);/);
    expect(names).toMatch(/export function useCategoryIdByName\(\)/);
    expect(names).toMatch(/return maps\?\.ids\.get\(stored\);/);
  });
});

describe("every round icon is Discover's face", () => {
  it("the preview sheet's rows", () => {
    expect(sheet).toMatch(/<CategoryArtwork\s*\n\s*categoryId=\{idForCategory\(round\.name\)\}\s*\n\s*iconSlug=\{roundIconSlug/);
    expect(sheet).not.toMatch(/DynamicIcon/);
  });

  it("the public card's category chip", () => {
    expect(pub).toMatch(/<CategoryArtwork categoryId=\{mixed \? undefined : idForCategory\(room\.first_category_name\)\} iconSlug=\{categoryIcon\} size=\{26\} flat/);
  });

  it("the lobby's chip, fed the id beside the slug", () => {
    expect(lobbyUi).toMatch(/<CategoryArtwork categoryId=\{categoryId \?\? undefined\} iconSlug=\{iconSlug\} size=\{32\} flat \/>/);
    expect(lobbyUi).toMatch(/categoryId=\{category\.categoryId\}/);
    expect(lobby).toMatch(/categoryId: currentRoom\.category_id \?\? idForCategoryName\(currentRoom\.category_name\) \?\? null,/);
    expect(lobby).toMatch(/categoryId: freshStart \? undefined : firstCategoryId,/);
  });

  it("the summary sheet and the round list", () => {
    expect(lobby).toMatch(/categoryId: item\.category_id \?\? idForCategoryName\(item\.category_name\) \?\? null,/);
    expect(summary).toMatch(/<CategoryArtwork categoryId=\{round\.categoryId \?\? undefined\} iconSlug=\{round\.iconSlug \?\? "mystery-box"\} size=\{28\} flat \/>/);
    expect(order).toMatch(/<CategoryArtwork categoryId=\{categoryId\} iconSlug=\{iconSlug\} size=\{22\} flat \/>/);
    expect(order).toMatch(/const categoryId = \(isHeld\(entry\) \? entry\.categoryId : entry\.category_id\) \?\? undefined;/);
    for (const src of [summary, order]) expect(src).not.toMatch(/DynamicIcon/);
  });
});

describe("and the TV, which showed the glyph after every other screen was fixed", () => {
  // The round intro on the TV drew "Guess the Logo" under a magnifying
  // glass (owner: "why i'm still seeing this icon? guess logo icon is
  // different, why we show this search icon here?"). The TV session
  // carries the round's name and slug, so the id is found from the name.
  const intro = read("src/components/tv/TVRoundIntroScreen.tsx");
  const countdown = read("src/components/tv/TVCountdownScreenV2.tsx");

  it("the round intro", () => {
    expect(intro).toMatch(/const idForCategory = useCategoryIdByName\(\);/);
    expect(intro).toMatch(/\{categoryIcon && <CategoryArtwork categoryId=\{idForCategory\(categoryName\)\} iconSlug=\{categoryIcon\} size=\{80\} \/>\}/);
    expect(intro).not.toMatch(/AppIcon/);
  });

  it("and the countdown", () => {
    expect(countdown).toMatch(/\{categoryIcon && <CategoryArtwork categoryId=\{idForCategory\(categoryName\)\} iconSlug=\{categoryIcon\} size=\{40\} flat \/>\}/);
    expect(countdown).not.toMatch(/AppIcon/);
  });
});
