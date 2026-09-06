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
    // The title alone (owner's ask): no line under it explaining the title.
    expect(rooms).not.toMatch(/railFirstRoomDesc/);
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

  it("the words sit below the icon — the title alone, no subtitle", () => {
    // The title already says what to do; the explaining line beneath it
    // made the invitation read as a notice (owner's ask). The panel takes
    // no desc at all, so a call site cannot quietly bring one back.
    const icon = card.indexOf("src={variant ===");
    const title = card.indexOf("{title}");
    expect(icon).toBeLessThan(title);
    expect(card).not.toMatch(/\{desc && \(/);
    expect(card).not.toMatch(/desc\?: string/);
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
  it("are the frame's display face at 26px, with no line under them (Figma 1076:2116)", () => {
    expect(feed).toMatch(/font-display text-\[26px\] leading-\[34px\] tracking-\[-0\.16px\] text-\[#552d7a\]/);
    expect(feed).not.toMatch(/font-hero text-\[19px\]/);
    expect(feed).not.toMatch(/desc=\{/);
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
  it("a card and most of the next, so the rail plainly scrolls", () => {
    // Half the screen each to a cap. At the old 164px floor the art was
    // barely wider than the progress pill under it.
    expect(feed).toMatch(/w-\[min\(52vw,208px\)\]/);
    expect(feed).not.toMatch(/w-\[max\(164px/);
  });

  it("and a name that wraps does not make its card taller", () => {
    // #543 widened these BECAUSE Georgian names truncated at one line, so
    // the second line stays. But `min-h` of 2.2em is SHORTER than two lines
    // of normal leading, so a wrapped name pushed its own card down and the
    // rail lost its shared bottom edge — fixed leading, two of them tall.
    expect(category).toMatch(/isFull \? "line-clamp-1" : "line-clamp-2 h-\[2\.4em\] leading-\[1\.2\]"/);
    expect(category).not.toMatch(/min-h-\[2\.2em\]/);
    // The full-size card is unchanged — it was never short of room.
    expect(category).not.toMatch(/className="font-bold tracking-wider line-clamp-1 text-left"/);
  });

  it("every card's art fills one box, whichever way it is drawn", () => {
    // The bundled 3D renders sized to 53% of the card's width and the icon
    // library's PNGs to a flat 128px, so one rail carried two icon sizes —
    // and on a narrow card the 128px one ran under the progress bar.
    expect(category).toMatch(/const ICON_BOX =/);
    expect(category).toMatch(/h-\[62%\] w-\[62%\] -translate-y-\[7%\]/);
    expect(category).toMatch(/\[&_img\]:h-full \[&_img\]:w-full \[&_img\]:object-contain/);
    // DynamicIcon's non-image states set 128px inline; the child cap keeps
    // them inside the box.
    expect(category).toMatch(/\[&>\*\]:max-h-full \[&>\*\]:max-w-full/);
    expect(category).not.toMatch(/w-\[53%\] max-h-\[63%\]/);
  });
});

describe("a room card on the home rail can be tapped", () => {
  it("the swipe-to-delete drag is off there", () => {
    // It exists for one thing — swipe left to reveal "delete this room" —
    // and the home rail offers no delete. What it DID offer there was a
    // horizontal gesture inside a horizontal scroller: framer takes the
    // pointer, the tap never becomes a click, and pressing a room did
    // nothing at all.
    expect(rooms).toMatch(/drag=\{isMobile && !homeRail \? "x" : false\}/);
    expect(rooms).toMatch(/onDragEnd=\{isMobile && !homeRail \? handleDragEnd : undefined\}/);
    expect(rooms).toMatch(/onPointerDown=\{isMobile && !homeRail \? handlePointerDown : undefined\}/);
    expect(rooms).toMatch(/onPointerMove=\{isMobile && !homeRail \? handlePointerMove : undefined\}/);
  });

  it("and the red delete plate under it is not drawn", () => {
    // Nothing there can swipe to reveal it.
    expect(rooms).toMatch(/\{isMobile && !homeRail && \(/);
  });

  it("but the rooms page keeps its swipe", () => {
    // Only the home rail's card was changed; the page's card is untouched.
    expect(rooms).toMatch(/drag=\{isMobile \? "x" : false\}/);
    expect(rooms).toMatch(/onClick=\{handleClick\}/);
  });

  it("and the tap reaches a lobby the home screen can show", () => {
    // enterRoom only moves the multiplayer context to "lobby", and the lobby
    // is drawn by the /team page. On the rooms page that is the page
    // underneath, so the join shows at once; on the home screen nothing
    // renders it, and the tap joined the room with no change on screen.
    // The home rail goes through the route every other entry already uses.
    expect(rooms).toMatch(
      /if \(homeRail\) \{\s*\n\s*navigate\(`\/team\?join=\$\{roomCode\}`, \{ state: \{ entering: true \} \}\);/,
    );
    // Every join on the card's path goes through that switch — the plain
    // context join survives only inside it.
    expect(rooms).toMatch(/await enterClassicRoom\(room\.room_code\)/);
    expect(rooms.match(/await enterRoom\(/g)).toHaveLength(1);
    // And TeamV2 still honours the flag the route carries.
    const team = read("src/pages/TeamV2.tsx");
    expect(team).toMatch(/entering\?: boolean/);
  });
});
