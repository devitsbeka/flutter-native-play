/**
 * A round with no category yet wears the box, everywhere it is announced.
 *
 * Owner: "check why we do not show mixed category icon, i noticed it is
 * shown as question mark when game starts on 3,2,1 screen". Two things,
 * one cause each:
 *
 *  - The lobby chip drew a random round at the head of the queue with no
 *    icon at all: roundIconSlug knew the player's own trivia and nothing
 *    else, so "Random" sat beside an empty slot while the round list under
 *    it drew the box.
 *  - The countdown draws the box only when it RECOGNISES the round as
 *    undecided, by id or by stored word; a round whose stored name it did
 *    not know fell through to a grey question mark. And a mixed round
 *    queued after a real one never wrote its own id, so the room kept the
 *    previous round's category_id under the name "Mixed", and screens that
 *    read the id first drew the previous round's picture.
 *
 * So: a round with no category id and no icon of any kind is undecided by
 * definition; a mixed round from the queue writes "__mixed__", the same
 * value startGame already understands; and the resolver every list shares
 * hands random and mixed rounds the box.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { roundIconSlug } from "@/utils/ownTriviaRound";
import { UNDECIDED_ICON_SLUG } from "@/utils/undecidedRound";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const countdown = read("src/components/team/RoundCountdown.tsx");
const results = read("src/components/team/GameResultsScreenV2.tsx");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const watcher = read("src/components/system/RoundStartWatcher.tsx");
const ctx = read("src/contexts/MultiplayerContextV2.tsx");

describe("the shared resolver", () => {
  it("hands random and mixed rounds the box, in any language the name was stored in", () => {
    expect(roundIconSlug({ source_type: "random" })).toBe(UNDECIDED_ICON_SLUG);
    expect(roundIconSlug({ source_type: "random", category_name: "შემთხვევითი" })).toBe(UNDECIDED_ICON_SLUG);
    expect(roundIconSlug({ source_type: "category", category_id: "__mixed__", category_name: "Mixed" })).toBe(UNDECIDED_ICON_SLUG);
    expect(roundIconSlug({ source_type: "category", category_name: "Gemischt" })).toBe(UNDECIDED_ICON_SLUG);
  });

  it("and still nothing for a real category with no icon", () => {
    expect(roundIconSlug({ source_type: "category", category_id: "world-history", category_name: "World History" })).toBeUndefined();
  });

  it("the lobby chip reads it for the head of the queue, and the room's own held round", () => {
    expect(lobby).toMatch(/: roundIconSlug\(firstQueue\)/);
    expect(lobby).toMatch(/\|\| \(isUndecidedRound\(currentRoom\.category_id, currentRoom\.category_name\) \? UNDECIDED_ICON_SLUG : null\),/);
  });
});

describe("the countdown", () => {
  it("treats no id and no icon as undecided, whatever the stored word", () => {
    expect(countdown).toMatch(/const mystery = isUndecidedRound\(categoryId, categoryName\) \|\| \(!categoryId && !iconSlug && !mapSlug\);/);
  });

  it("never lets a stale id pick a picture for a mixed round", () => {
    expect(countdown).toMatch(/<CategoryArtwork categoryId=\{mystery \? null : categoryId\} iconSlug=\{slug\} size=\{120\} \/>/);
    expect(results).toMatch(/isUndecidedRound\(currentRoom\.category_id, currentRoom\.category_name\)\s*\n\s*\? null\s*\n\s*: resultsCategory\.categoryId \?\? currentRoom\.category_id/);
  });

  it("is fed the category's own icon from the round-start watcher too", () => {
    expect(watcher).toMatch(/const roundCategory = useCategoryIdentity\(startedRound\?\.categoryId\);/);
    expect(watcher).toMatch(/iconSlug=\{roundCategory\.iconSlug\}/);
  });
});

describe("a mixed round from the queue says what it plays", () => {
  it("writes __mixed__ to the room instead of leaving the previous round's id", () => {
    expect(ctx).toMatch(/const newCategoryId = nextItem\.source_type === "random" \? null : \(isMixedCategory \? "__mixed__" : nextItem\.category_id\);/);
    expect(ctx).not.toMatch(/isMixedCategory \? undefined : nextItem\.category_id/);
  });

  it("and still asks for no category when fetching, since __mixed__ is not a slug", () => {
    expect(ctx).toMatch(/categorySlug: isMixedCategory \? undefined : \(newCategoryId \|\| undefined\),/);
    expect(ctx).toMatch(/if \(newCategoryId && !isMixedCategory && await isMostLikelyCategoryId\(newCategoryId\)\)/);
  });
});
