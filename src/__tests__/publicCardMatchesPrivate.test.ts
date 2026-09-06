/**
 * The public card is the private card, and the leave dialog is honest.
 *
 * Owner's calls: the dark-versus-whitish pair was turned down — every
 * public card wears one style, the private card's, and whether the viewer
 * has been in a room is said by the leave icon alone; and a guest leaving
 * a public room is not told it will vanish from the list, because it stays.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const pub = read("src/components/team/PublicRoomsSection.tsx");
const mine = read("src/components/team/MyRoomsSection.tsx");

describe("one style, the private card's", () => {
  it("one ink, and no second mood over the ground", () => {
    expect(pub).toMatch(/const ink = INK\.light;/);
    expect(pub).not.toMatch(/INK\.dark|titleShadow|dotRing|bg-white\/55/);
  });

  it("the same lip, the same proportions", () => {
    const lip = 'boxShadow: "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)"';
    expect(pub).toContain(lip);
    expect(mine).toContain(lip);
    expect(pub).toMatch(/aspect-\[1\.45\/1\] md:aspect-\[1\.15\/1\]/);
    expect(mine).toMatch(/aspect-\[1\.45\/1\] md:aspect-\[1\.15\/1\]/);
    expect(pub).not.toMatch(/min-h-\[202px\]|aspect-\[1\.55\/1\]|overflow-hidden shadow-lg"/);
  });

  it("the same pills, bar, faces and icon", () => {
    // Pills: the private card's dark scrim, no border.
    expect(pub).toMatch(/pill: "bg-black\/25 backdrop-blur-sm",/);
    expect(mine).toMatch(/rounded-full bg-black\/25 backdrop-blur-sm px-2\.5 py-1/);
    expect(pub).not.toMatch(/backdrop-blur-md border (pl-1|px-2\.5)/);
    // The leave/delete button at the private card's size.
    expect(pub).toMatch(/w-8 h-8 rounded-full flex items-center justify-center hover:bg-black\/35 active:scale-95 transition \$\{ink\.pill\}/);
    // The bar: the private card's light glass.
    const bar = "bg-white/15 backdrop-blur-md border border-white/20";
    expect(pub).toContain(`const BAR = "${bar}";`);
    expect(mine).toContain(`${bar} rounded-xl px-3 py-2.5`);
    // Faces and open seats at the private card's size and ring.
    expect(pub).toMatch(/block w-8 h-8 rounded-full overflow-hidden border-2 \$\{ink\.ring\}/);
    expect(pub).toMatch(/ring: "border-white\/40",/);
    expect(pub).toMatch(/w-8 h-8 rounded-full border-2 border-dashed border-white\/40 bg-white\/10 shrink-0/);
    // The room's icon at the private card's size.
    expect(pub).toMatch(/w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-lg shrink-0/);
    expect(mine).toMatch(/w-14 h-14 md:w-16 md:h-16 object-contain drop-shadow-lg flex-shrink-0/);
  });

  it("the leave icon is what says you are in", () => {
    expect(pub).toMatch(/const inside = room\.my_state === "host" \|\| room\.my_state === "joined";/);
    expect(pub).toMatch(/\{inside && \(/);
  });
});

describe("the leave dialog", () => {
  it("states a consequence only for the host's delete", () => {
    expect(pub).toMatch(/\{removing\?\.my_state === "host" && \(\s*\n\s*<AlertDialogDescription>\{t\("extra\.rlDeleteRoomConfirm"\)\}<\/AlertDialogDescription>/);
    expect(pub).not.toMatch(/t\("extra\.rlLeaveRoomConfirm"\)/);
  });
});
