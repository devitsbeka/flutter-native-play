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
    expect(feed).toMatch(/\{trivias\.length === 0 && \(\s*\n\s*<div className="px-4 pb-3 pt-1">/);
    expect(feed).toMatch(/<StartHereCard\s*\n\s*variant="trivia"/);
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

describe("the panel itself", () => {
  it("takes the whole width, with the words inside it", () => {
    // A card-shaped placeholder left most of the row blank, which reads as
    // a rail that failed to load rather than one waiting to be filled.
    expect(card).toMatch(/flex w-full flex-col items-center justify-center/);
    expect(card).toMatch(/border-2 border-dashed/);
    // Both rails hand it a full-width box rather than a scroller.
    expect(feed).toMatch(/<div className="px-4 pb-3 pt-1">\s*\n\s*<StartHereCard/);
    expect(rooms).toMatch(/<div className="px-4 pb-4">\s*\n\s*<StartHereCard/);
  });

  it("wears the picture of the rail it stands in", () => {
    // Each surface's own icon, not a generic plus — that said only
    // "something goes here".
    expect(card).toMatch(/import danceFloorIcon from "@\/assets\/dance-floor\.png";/);
    expect(card).toMatch(/import triviaBuzzerIcon from "@\/assets\/trivia-buzzer\.png";/);
    expect(card).toMatch(/variant === "room" \? danceFloorIcon : triviaBuzzerIcon/);
    expect(card).not.toMatch(/<Plus /);
  });

  it("the words sit below the icon, title over subtitle", () => {
    const icon = card.indexOf("src={variant ===");
    const title = card.indexOf("{title}");
    const desc = card.indexOf("{desc && (");
    expect(icon).toBeLessThan(title);
    expect(title).toBeLessThan(desc);
    // Subtitle in regular weight, matching the rail headers.
    expect(card).toMatch(/text-\[12px\] font-normal leading-\[16px\] text-\[#6b5b86\]/);
  });

  it("in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      for (const key of [
        "railFirstRoom", "railFirstRoomDesc", "railFirstTrivia", "railFirstTriviaDesc",
      ]) {
        expect(locale, `${lang}.${key}`).toMatch(new RegExp(`\\n\\s+${key}: "..`));
      }
    }
  });
});

describe("the rail headers", () => {
  it("are the frame's 18px semibold sans over a 12px medium line (Figma 1076:2116)", () => {
    // The heading used to be the 19px display face with a regular-weight
    // subtitle; the home frame draws a plain Georgian sans heading and a
    // medium Nunito line under it.
    expect(feed).toMatch(/font-georgian text-\[18px\] font-semibold leading-\[22px\] text-\[#402666\]/);
    expect(feed).toMatch(/text-\[12px\] font-medium leading-\[15px\] tracking-\[-0\.16px\] text-\[#6b5b86\]"/);
    expect(feed).not.toMatch(/font-hero text-\[19px\]/);
  });

  it("an empty rail swaps 'see all' for a +", () => {
    // "See all trivias" leads to an empty list when there are none; the
    // only useful thing in that corner is the way to make the first.
    expect(feed).toMatch(/kind\?: "link" \| "add"/);
    expect(feed).toMatch(/action\.kind === "add" \? \(/);
    expect(feed).toMatch(/<Plus className="h-5 w-5" strokeWidth=\{2\.75\} \/>/);
    // Still announced, since the glyph carries no words.
    expect(feed).toMatch(/aria-label=\{action\.label\}/);
  });

  it("on both rails, from the real counts", () => {
    expect(feed).toMatch(/roomsEmpty\s*\n?\s*\? \{ label: t\("extra\.railFirstRoom"\)[^}]*kind: "add" \}/);
    expect(feed).toMatch(/trivias\.length === 0\s*\n\s*\? \{/);
  });

  it("and the rooms count is reported up, not fetched twice", () => {
    expect(rooms).toMatch(/onEmptyChange\?: \(empty: boolean\) => void;/);
    // Not while loading: `rooms` is empty then too, and a + would flash
    // over a rail that is about to fill.
    expect(rooms).toMatch(
      /const isEmpty = !loading && rooms\.length === 0 && searchQuery\.trim\(\)\.length === 0;/,
    );
    // And ABOVE the `if (loading)` early return — a hook after a
    // conditional return is called in a different order on the loading
    // pass than on the loaded one.
    const effect = rooms.indexOf("onEmptyChange?.(isEmpty);");
    const earlyReturn = rooms.indexOf("if (loading) {");
    expect(effect).toBeGreaterThan(-1);
    expect(effect).toBeLessThan(earlyReturn);
    expect(feed).toMatch(/onEmptyChange=\{setRoomsEmpty\}/);
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
