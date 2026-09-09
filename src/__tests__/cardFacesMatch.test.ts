/**
 * Every face on a room card is the same size, the host's ringed in gold.
 *
 * The host sat in their pill at 24px with no ring, beside guests at 32px
 * with a green or grey one and a dashed "+" at 32px - so the person who
 * runs the room read as the smallest one in it, and the white pill around
 * them made it worse (owner: "white stroke on host's avatar makes it look
 * small, make yellow stroke; match avatars and + button sizes, +5%"). Every
 * circle on the row is 34px now; the host's wears a gold ring; and the
 * crown sits ON that ring, centred over the top of the face, the way a
 * crown is worn (owner: "put crown icon on stroke, above the avatar")
 * rather than standing beside it. Both cards, so the tabs match.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const mine = read("src/components/team/MyRoomsSection.tsx");
const grid = mine.slice(mine.indexOf("export function RoomCardGrid("));
const pub = read("src/components/team/PublicRoomsSection.tsx");

for (const [name, src, ring] of [
  ["private grid card", grid, /ring-2 ring-amber-400 ring-offset-1 ring-offset-transparent/],
  ["public card", pub, /border-2 border-amber-400/],
] as const) {
  describe(name, () => {
    it("the host's face is 34px in a gold ring, and the crown sits on the ring above it", () => {
      expect(src).toMatch(new RegExp(`block w-\\[34px\\] h-\\[34px\\] rounded-full overflow-hidden ${ring.source}`));
      expect(src).not.toMatch(/block w-6 h-6 rounded-full overflow-hidden/);
      // The crown is a child of the face's relative wrapper, absolutely
      // placed on the top edge and centred - not a sibling before the face.
      const crown = '<img src={crownIcon} alt="" className="pointer-events-none absolute -top-2 left-1/2 z-10 w-[18px] h-[18px] -translate-x-1/2 object-contain drop-shadow-sm" />';
      const hostFace = src.indexOf("block w-[34px] h-[34px] rounded-full overflow-hidden");
      const wrapperClose = src.indexOf("</span>", src.indexOf("</span>", hostFace) + 1);
      const crownAt = src.indexOf(crown);
      expect(crownAt).toBeGreaterThan(hostFace);
      expect(crownAt).toBeLessThan(wrapperClose);
      expect(src).not.toMatch(/<img src=\{crownIcon\} alt="" className="w-4 h-4 object-contain shrink-0" \/>/);
    });

    it("the guests and the + are the same 34px", () => {
      expect(src).toMatch(/w-\[34px\] h-\[34px\] rounded-full border-2 border-dashed/);
      expect(src).not.toMatch(/w-8 h-8 rounded-full border-2 border-dashed/);
      expect(src).not.toMatch(/w-8 h-8 rounded-full overflow-hidden/);
    });
  });
}
