/**
 * The level page's header shows the category's icon before its name.
 *
 * The header read "Guess the Celebrity" between the back arrow and the
 * clock, with nothing to say which game this was but the words (owner:
 * "make sure we show category icon in header, before the category
 * title"). It wears the category's own art now — the same picture the
 * duel intro and the Discover cards use — flat, at text height, ahead of
 * the title.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const level = read("src/pages/CategoryQuizPage.tsx");

describe("the level header", () => {
  it("draws the category's art before the title, from the same source the intro uses", () => {
    expect(level).toMatch(/import \{ CategoryArtwork \} from "@\/components\/shared\/CategoryArtwork";/);
    expect(level).toMatch(
      /<CategoryArtwork categoryId=\{categoryId\} iconSlug=\{dbCategory\?\.icon_slug \?\? null\} size=\{28\} flat className="shrink-0" \/>\s*\n\s*<span className="text-white font-bold text-base truncate max-w-\[160px\] text-center">\s*\n\s*\{categoryTitle \|\| "Quiz"\}/,
    );
  });

  it("and the two sit in one centred row between the arrow and the clock", () => {
    const header = level.slice(level.indexOf("{/* Header - Solo mode"), level.indexOf("<TimerBadge"));
    expect(header).toMatch(/<span className="flex min-w-0 items-center justify-center gap-2">/);
    expect(header).toMatch(/<CategoryArtwork/);
  });
});
