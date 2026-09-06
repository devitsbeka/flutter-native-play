/**
 * A card on the home's My Trivias rail says what it is.
 *
 * The rail used to carry the player's standalone posts alone, each a bare
 * gradient or a cover with nothing on it — a collection never appeared and
 * a party looked like any trivia. Now trivias, parties and collections ride
 * the rail together, newest first, and each wears its kind's icon: large in
 * the middle of a bare gradient, as a small badge over a cover (owner's
 * ask: "make sure icons are visible on cards").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const feed = read("src/components/home/MobileHomeFeed.tsx");

describe("the three kinds and their faces", () => {
  it("wear the icons the create chooser offers them under", () => {
    const chooser = read("src/components/social/CreateTriviaTypeModal.tsx");
    for (const asset of ["trivia-buzzer.png", "icon-collections.png", "group-of-people.png"]) {
      expect(feed).toContain(`@/assets/${asset}`);
      expect(chooser).toContain(`@/assets/${asset}`);
    }
    expect(feed).toMatch(/trivia: triviaBuzzer,\s*\n\s*party: iconGroupOfPeople,\s*\n\s*collection: iconCollections,/);
  });

  it("a party is a post whose subject is personal; a collection is its own table", () => {
    expect(feed).toMatch(/kind: \(p\.subject === "personal" \? "party" : "trivia"\) as TriviaKind/);
    expect(feed).toMatch(/\.from\("quiz_collections"\)\s*\n\s*\.select\("id, title, cover_image, cover_gradient, created_at"\)/);
    expect(feed).toMatch(/collection: \(id\) => `\/collection\/\$\{id\}`/);
    // Newest first across both sources, ten at most.
    expect(feed).toMatch(/\.sort\(\(a, b\) => \(b\.created_at \?\? ""\)\.localeCompare\(a\.created_at \?\? ""\)\)\s*\n\s*\.slice\(0, 10\)/);
  });

  it("the icon is on the card either way: large on a bare gradient, a badge over a cover", () => {
    expect(feed).toMatch(/\{tr\.cover_image \? \(\s*\n\s*<span className="absolute bottom-1\.5 right-1\.5 flex h-8 w-8 items-center justify-center rounded-full bg-white\/90/);
    expect(feed).toMatch(/className="h-\[56%\] w-\[56%\] object-contain drop-shadow-\[0_4px_10px_rgba\(60,30,90,0\.35\)\]"/);
    expect(feed).toMatch(/src=\{KIND_ICON\[tr\.kind\]\}/);
    expect(feed).toMatch(/onClick=\{\(\) => navigate\(KIND_ROUTE\[tr\.kind\]\(tr\.id\)\)\}/);
  });
});
