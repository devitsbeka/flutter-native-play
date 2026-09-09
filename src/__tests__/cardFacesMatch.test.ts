/**
 * Every face on a room card is the same size, the host's ringed in gold.
 *
 * The host sat in their pill at 24px with no ring, beside guests at 32px
 * with a green or grey one and a dashed "+" at 32px - so the person who
 * runs the room read as the smallest one in it, and the white pill around
 * them made it worse (owner: "white stroke on host's avatar makes it look
 * small, make yellow stroke; match avatars and + button sizes, +5%"). Every
 * circle on the row is 34px now; the host's wears a gold ring; and the
 * crown leads the pill, a size up, rather than hanging between face and
 * name. Both cards, so the tabs match.
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
    it("the host's face is 34px in a gold ring, and the crown leads the pill", () => {
      expect(src).toMatch(new RegExp(`block w-\\[34px\\] h-\\[34px\\] rounded-full overflow-hidden ${ring.source}`));
      expect(src).not.toMatch(/block w-6 h-6 rounded-full overflow-hidden/);
      const crown = src.indexOf('<img src={crownIcon} alt="" className="w-4 h-4 object-contain shrink-0" />');
      const hostFace = src.indexOf("block w-[34px] h-[34px] rounded-full overflow-hidden");
      expect(crown).toBeGreaterThan(-1);
      expect(crown).toBeLessThan(hostFace);
    });

    it("the guests and the + are the same 34px", () => {
      expect(src).toMatch(/w-\[34px\] h-\[34px\] rounded-full border-2 border-dashed/);
      expect(src).not.toMatch(/w-8 h-8 rounded-full border-2 border-dashed/);
      expect(src).not.toMatch(/w-8 h-8 rounded-full overflow-hidden/);
    });
  });
}
