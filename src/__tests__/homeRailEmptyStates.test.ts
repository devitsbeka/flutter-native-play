/**
 * A rail with nothing in it should still be a rail.
 *
 * Two of the home feed's rows had no answer for "you have not made one yet".
 * The Trivias row hid its whole section, so a player who had never made a
 * trivia had no heading for the feature and no way into it — it was
 * invisible to exactly the people who had not found it. The Rooms row
 * dropped a full-width centred panel into a row of horizontal cards, which
 * reads as an error rather than an invitation.
 *
 * Both now show a card, in the rail, in the shape of the thing it stands in
 * for, and the card is the way to make one.
 *
 * The Categories row is a separate ask: two cards filled the width with
 * nothing after them, so the row did not look scrollable.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const feed = read("src/components/home/MobileHomeFeed.tsx");
const rooms = read("src/components/team/MyRoomsSection.tsx");
const card = read("src/components/home/StartHereCard.tsx");
const category = read("src/components/discover/AirbnbCategoryCard.tsx");

describe("the trivias rail no longer disappears", () => {
  it("the section renders whether or not there are any", () => {
    expect(feed).not.toMatch(/\{trivias\.length > 0 && \(\s*\n\s*<section>/);
    expect(feed).toMatch(/railMyTrivias/);
  });

  it("and an empty one offers the way to make the first", () => {
    expect(feed).toMatch(/\{trivias\.length === 0 && \(\s*\n\s*<StartHereCard\s*\n\s*variant="trivia"/);
    expect(feed).toMatch(/title=\{t\("extra\.railFirstTrivia"\)\}/);
    // Straight to the create sheet, not to a list the player would then
    // have to find it in.
    expect(feed).toMatch(/onPress=\{\(\) => navigate\("\/team", \{ state: \{ openTrivia: true \} \}\)\}/);
  });
});

describe("the rooms rail keeps its shape when empty", () => {
  it("the home rail gets a card, not the full-width panel", () => {
    expect(rooms).toMatch(/rooms\.length === 0 && homeRail && !searching \?/);
    expect(rooms).toMatch(/<StartHereCard\s*\n\s*variant="room"/);
    expect(rooms).toMatch(/title=\{t\("extra\.railFirstRoom"\)\}/);
    expect(rooms).toMatch(/desc=\{t\("extra\.railFirstRoomDesc"\)\}/);
    expect(rooms).toMatch(/onPress=\{\(\) => onCreateRoom\?\.\(\)\}/);
  });

  it("but a fruitless SEARCH still says 'no room found', not 'make your first'", () => {
    // Those are different sentences, and only one of them is true.
    expect(rooms).toMatch(/&& !searching \?/);
    expect(rooms).toMatch(/t\("extra\.searchRoomNotFound"\)/);
  });

  it("and every other surface keeps the panel it had", () => {
    // The rooms TAB is a page, not a rail: a centred panel is right there,
    // and the onboarding carousel for a brand-new player is untouched.
    expect(rooms).toMatch(/\) : rooms\.length === 0 \? \(\s*\n\s*showOnboardingCarousel \? \(/);
    expect(rooms).toMatch(/<FeatureOnboardingCarousel/);
  });
});

describe("the card itself", () => {
  it("matches the shape of what it stands in for", () => {
    // Room: the rail's own card width. Trivia: the 132px cover square.
    expect(card).toMatch(/w-\[70vw\] max-w-\[280px\]/);
    expect(card).toMatch(/h-\[132px\] w-full items-center justify-center rounded-\[18px\]/);
    expect(card).toMatch(/w-\[132px\]/);
  });

  it("reads as an outline of a card that does not exist yet", () => {
    expect(card.match(/border-2 border-dashed/g) ?? []).toHaveLength(2);
    expect(card).toMatch(/<Plus /);
  });

  it("only the room card carries a second line", () => {
    // The trivia tile's label sits under a 132px square; a subtitle there
    // would push the rail out of alignment for one word.
    expect(card).toMatch(/desc\?: string;/);
    expect(card).toMatch(/\{desc && \(/);
  });

  it("in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      for (const key of ["railFirstRoom", "railFirstRoomDesc", "railFirstTrivia"]) {
        expect(locale, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "..`));
      }
    }
  });
});

describe("the categories rail shows there is more to the right", () => {
  it("two cards and the edge of a third", () => {
    // Was /1.9 with a 212px floor, which is two cards and nothing after
    // them on a phone.
    expect(feed).toMatch(/w-\[max\(164px,calc\(\(100vw_-_56px\)\/2\.35\)\)\]/);
    expect(feed).not.toMatch(/calc\(\(100vw_-_56px\)\/1\.9\)/);
  });

  it("and the width it gave up comes back as a second line", () => {
    // #543 widened these BECAUSE Georgian names truncated at one line.
    // Narrowing them again without this would just reintroduce that.
    expect(category).toMatch(/isFull \? "line-clamp-1" : "line-clamp-2 min-h-\[2\.2em\]"/);
    // The full-size card is unchanged — it was never short of room.
    expect(category).not.toMatch(/className="font-bold tracking-wider line-clamp-1 text-left"/);
  });
});
