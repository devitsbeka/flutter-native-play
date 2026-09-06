/**
 * The search screen's friends and rooms rows each lead with a way to add
 * one, and every room sits in its own stroked container.
 *
 * The rows used to be lists and nothing more: a player with no friends saw
 * no friends row at all, and one with friends had no way from here to add
 * another. Both rows now open with a + tile — first, where a thumb lands
 * before it scrolls — and are there whether the row has anything in it yet
 * or not. The rooms' + makes a room on the create page; the friends' +
 * opens the add-friend sheet, which the search owns itself because it is
 * opened from every page's header.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lists = read("src/components/search/SearchHorizontalLists.tsx");
const cards = read("src/components/search/SearchMiniCards.tsx");
const search = read("src/components/search/SpotlightSearch.tsx");

describe("the search screen's rows lead with a +", () => {
  it("first in the friends row, and the row is always there", () => {
    expect(lists).toMatch(
      /icon=\{Users\}\s*\n\s*>\s*\n\s*<AddMiniCard variant="friend" label=\{t\("extra\.ssAddFriend"\)\} onClick=\{onAddFriend\} \/>\s*\n\s*\{friends\.map/,
    );
    expect(lists).not.toMatch(/isEmpty=\{friends\.length === 0\}/);
  });

  it("first in the rooms row, and the row is always there", () => {
    expect(lists).toMatch(
      /gap="loose"\s*\n\s*>\s*\n\s*<AddMiniCard variant="room" label=\{t\("extra\.ssAddRoom"\)\} onClick=\{onCreateRoom\} \/>\s*\n\s*\{allRooms\.map/,
    );
    expect(lists).not.toMatch(/isEmpty=\{allRooms\.length === 0\}/);
  });

  it("the rooms' + goes to the create page, the friends' + opens the sheet the search owns", () => {
    expect(search).toMatch(/const handleCreateRoom = \(\) => \{\s*\n\s*handleOpenChange\(false\);\s*\n\s*navigate\("\/create-room"\);/);
    expect(search).toMatch(/const handleAddFriend = \(\) => \{\s*\n\s*handleOpenChange\(false\);\s*\n\s*setShowAddFriend\(true\);/);
    expect(search).toMatch(/<AddFriendModal isOpen=\{showAddFriend\} onClose=\{\(\) => setShowAddFriend\(false\)\} \/>/);
    expect(search).toMatch(/onAddFriend=\{handleAddFriend\}\s*\n\s*onCreateRoom=\{handleCreateRoom\}/);
  });

  it("drawn in the shape of the row it leads", () => {
    // A dashed circle among the faces, a dashed tile among the rooms.
    expect(cards).toMatch(/isFriend \? "w-14 h-14 rounded-full" : "w-16 h-16 rounded-2xl"/);
    expect(cards).toMatch(/border-2 border-dashed border-primary\/40 bg-primary\/5 text-primary/);
  });

  it("in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).toMatch(/ssAddFriend: "/);
      expect(locale, lang).toMatch(/ssAddRoom: "/);
    }
  });
});

describe("the search panel wears the floating-blob loop", () => {
  it("under everything, taking no taps, with the create page's wash over it", () => {
    expect(search).toMatch(/const blobVideo = useResponsiveVideo\("\/videos\/floating-blob\.mp4"\);/);
    expect(search).toMatch(
      /<div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>\s*\n\s*<BackgroundVideo\s*\n\s*sources=\{\[\s*\n\s*\{ src: blobVideo\.webm, type: "video\/webm" \},\s*\n\s*\{ src: blobVideo\.mp4, type: "video\/mp4" \},/,
    );
    expect(search).toMatch(/still="\/videos\/floating-blob-still\.jpg"/);
    // The header and the rows sit above it.
    expect(search).toMatch(/className="relative z-10 flex items-center gap-3 p-4 border-b border-white\/60"/);
    expect(search).toMatch(/className="relative z-10 flex-1 overflow-y-auto pb-\[calc\(80px\+env\(safe-area-inset-bottom\)\)\]"/);
    // And the panel clips the loop instead of letting it scroll the page.
    expect(search).toMatch(/fixed inset-0 safe-screen z-\[100\] bg-background flex flex-col overflow-hidden/);
  });
});

describe("every room on the strip sits in a stroked container", () => {
  it("one class for the room tile and the + that leads them", () => {
    expect(cards).toMatch(
      /export const ROOM_TILE_CLASS =\s*\n\s*"flex flex-col items-center gap-2 min-w-\[104px\] rounded-\[18px\] border border-\[#e7def6\] bg-white\/70 px-3 py-2\.5";/,
    );
    // The room card wears it, and the room + wears the same one.
    expect(cards.match(/className=\{ROOM_TILE_CLASS\}/g) ?? []).toHaveLength(1);
    expect(cards).toMatch(/: ROOM_TILE_CLASS\s*\n\s*\}/);
  });

  it("with room between the containers", () => {
    expect(lists).toMatch(/gap === "loose" \? "gap-2 px-4" : "gap-1 px-2"/);
  });
});
