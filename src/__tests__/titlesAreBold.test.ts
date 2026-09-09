/**
 * Titles are bold - every one of them, in Georgian too.
 *
 * The display face the app self-hosts is Google Sans at ONE weight, 700.
 * Google Fonts supplies 300-600 behind it. So a title set in `font-display`
 * with no weight is not "the display face at its natural weight" - it is a
 * third-party regular, and next to the headings that do say `font-bold` it
 * reads as a lighter, different font. The owner's screenshots: the Rooms
 * rail title, the play-mode card names, the friends bar, My Powers, the
 * room cards - all regular, beside "Coins" in bold.
 *
 * `font-hero` has the same problem one layer down. Slackey is Latin-only
 * and ships one weight, so Georgian falls through to Google Sans - at 400
 * unless the element asks for bold. Asking for bold would also fake a
 * heavier Slackey onto the Latin, so `.font-hero` turns font synthesis off:
 * the Latin keeps the face as drawn, the Georgian gets the real 700.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** Every title that was regular in the owner's screenshots, and its siblings. */
const TITLES: Array<[file: string, pattern: RegExp]> = [
  // The rail heading on home, and Discover's, which must match it.
  ["src/components/home/MobileHomeFeed.tsx", /<h2 className="min-w-0 truncate font-display font-bold text-\[26px\]/],
  ["src/components/discover/SectionHeader.tsx", /<h2 className="min-w-0 truncate font-display font-bold text-\[26px\]/],
  // The mode's name at the foot of a play card.
  ["src/components/home/MobileHomeFeed.tsx", /truncate font-display font-bold text-\[16px\] leading-\[22\.5px\]/],
  // Room cards: the home rail's, the grid's, the list's, and the public ones.
  ["src/components/team/MyRoomsSection.tsx", /text-center font-display font-bold text-\[18px\]/],
  ["src/components/team/MyRoomsSection.tsx", /font-display font-bold text-white text-lg leading-tight truncate/],
  ["src/components/team/MyRoomsSection.tsx", /font-display font-bold text-\[#2b1a4a\] text-lg leading-tight/],
  ["src/components/team/PublicRoomsSection.tsx", /text-center font-display font-bold text-lg leading-tight/],
  ["src/components/team/PublicRoomsSection.tsx", /`font-display font-bold text-lg leading-tight line-clamp-2 \$\{ink\.text\}`/],
  // The shop's own heading, beside product sections that were already bold.
  ["src/components/shop/MyPowersSection.tsx", /font-display font-bold text-foreground/],
  // The two chooser headings.
  ["src/components/team/CreateRoomPage.tsx", /font-display font-bold text-\[24px\] leading-\[28px\] text-\[#3a2260\]/],
  ["src/components/team/GuessPickerScreen.tsx", /font-display font-bold text-\[24px\] leading-\[28px\] text-\[#3a2260\]/],
  // The hero titles: the chooser card, the friends bar, the create-trivia chooser.
  ["src/components/team/CreateRoomPage.tsx", /font-hero font-bold overflow-hidden text-ellipsis whitespace-nowrap text-\[calc\(32\*var\(--u\)\)\]/],
  ["src/components/team/CreateRoomPage.tsx", /font-hero font-bold truncate text-\[22px\] capitalize leading-\[48px\]/],
  ["src/components/social/CreateTriviaTypeModal.tsx", /font-hero font-bold text-\[28px\]/],
  ["src/components/social/CreateTriviaTypeModal.tsx", /font-hero font-bold text-\[20px\]/],
  ["src/components/social/CreateTriviaTypeModal.tsx", /font-hero font-bold text-\[18px\]/],
];

describe("every title asks for the bold weight", () => {
  for (const [file, pattern] of TITLES) {
    it(`${file} :: ${pattern.source.slice(0, 48)}`, () => {
      expect(read(file)).toMatch(pattern);
    });
  }
});

describe("the hero face is not faked bolder", () => {
  it("font-hero disables font synthesis, so bold reaches Georgian only", () => {
    const css = read("src/index.css");
    expect(css).toMatch(/\.font-hero\s*\{\s*font-synthesis:\s*none;\s*\}/);
  });

  it("which is safe because Slackey ships exactly one weight", () => {
    const css = read("src/index.css");
    const slackey = css.match(/@font-face\s*\{[^}]*font-family:\s*'Slackey'[^}]*\}/g) ?? [];
    expect(slackey).toHaveLength(1);
    expect(slackey[0]).toMatch(/font-weight:\s*400;/);
  });

  it("and the display face's Georgian is the self-hosted 700", () => {
    const css = read("src/index.css");
    const georgian = css.match(/@font-face\s*\{[^}]*GoogleSans-Bold-georgian[^}]*\}/)?.[0] ?? "";
    expect(georgian).toMatch(/font-weight:\s*700;/);
    expect(georgian).toMatch(/U\+10A0-10FF/);
  });
});
