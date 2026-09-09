/**
 * The party card's Play, in the same button every room card plays from —
 * and in the same colour as the rest of that screen.
 *
 * It was first ChunkyButton's generic "outline" variant — transparent face,
 * purple border and text — borrowed rather than drawn to this button's own
 * spec, and it read as a lesser action beside every filled, white Play on
 * the room cards around it. RoomCardPlayButton gained a third tone for it:
 * filled purple, white icon and text, same shape as mint and white.
 *
 * Purple did not last: sitting beside a screen that already speaks in mint
 * (a room ready to start) and white (Join, Enter, waiting on the host), a
 * third fill read as a colour of its own rather than the same action in the
 * same language — owner: "make play buttons other color, 'my trivia party'
 * should have one color on play button, just like we have on join button on
 * public rooms". The party card wears white now, same as Join/Enter.
 *
 * RoomCardTone keeps its purple option — the dev showcase (HomeShot) still
 * has a swatch for it — this is only about which tone the party card reaches
 * for.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const button = read("src/components/team/RoomCardPlayButton.tsx");
const tab = read("src/components/social/MyTriviaTab.tsx");
const publicRooms = read("src/components/team/PublicRoomsSection.tsx");

describe("RoomCardPlayButton's tones", () => {
  it("purple stays defined, even though the party card has moved off it; outline joined for the preview sheet's Close", () => {
    expect(button).toMatch(/export type RoomCardTone = "mint" \| "white" \| "purple" \| "outline";/);
    expect(button).toMatch(/purple: "bg-\[#7126d5\] border-\[#4e1a94\] text-white",/);
    expect(button).toMatch(/white: "bg-white border-\[#d5c9e8\] text-\[#320c69\]",/);
  });
});

describe("the party card's Play wears the rooms list's own white", () => {
  it("RoomCardPlayButton, in the white tone, not purple and not ChunkyButton's outline", () => {
    expect(tab).toMatch(/import \{ RoomCardPlayButton \} from "@\/components\/team\/RoomCardPlayButton";/);
    const card = tab.slice(
      tab.indexOf("function PersonalTriviaCard"),
      tab.indexOf("function StandaloneQuizCard"),
    );
    expect(card).toMatch(/<RoomCardPlayButton\s*\n\s*tone="white"/);
    expect(card).not.toMatch(/tone="purple"/);
    expect(card).not.toMatch(/variant="outline"/);
  });

  it("which is the same tone Join and Enter wear on the public rooms list", () => {
    // A ready-to-start public room goes mint and says Play; every other
    // state on that same card — Join, Enter, waiting on the host — is white.
    // That white is what the party card now shares, rather than a colour
    // that belongs to it alone.
    expect(publicRooms).toMatch(/tone=\{invited \|\| ready \? "mint" : "white"\}/);
  });
});
