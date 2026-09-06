/**
 * Two moods for one public room card, and an honest leave dialog.
 *
 * Owner's asks: a room you have been in should read apart from one you
 * have not — dark with an inner shade against whitish with light chips and
 * dark text, from the same gradient so they sit together; and the guest's
 * leave dialog must not promise the room will vanish from the list, since
 * a public room stays there (it goes only if the host blocks you).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const pub = read("src/components/team/PublicRoomsSection.tsx");

describe("the entered room and the untouched room", () => {
  it("pick their ink by whether the viewer has been in", () => {
    expect(pub).toMatch(/const inside = room\.my_state === "host" \|\| room\.my_state === "joined";/);
    expect(pub).toMatch(/const ink = inside \? INK\.light : INK\.dark;/);
  });

  it("the entered one is shaded in, the untouched one washed pale, over the same ground", () => {
    expect(pub).toMatch(
      /\{inside \? \(\s*\n\s*<div className="absolute inset-0 rounded-2xl bg-black\/15 shadow-\[inset_0_0_56px_rgba\(20,8,45,0\.55\)\]" \/>\s*\n\s*\) : \(\s*\n\s*<div className="absolute inset-0 rounded-2xl bg-white\/55" \/>/,
    );
  });

  it("dark ink means dark text on light chips, and no drop shadow under the title", () => {
    expect(pub).toMatch(/dark: \{\s*\n\s*text: "text-\[#2b1a4a\]",/);
    expect(pub).toMatch(/pill: "bg-white\/65 border-white\/80",/);
    expect(pub).toMatch(/titleShadow: "",/);
    // Neither title hard-codes the shadow any more.
    expect(pub).not.toMatch(/line-clamp-2 drop-shadow-md/);
    expect(pub.match(/\$\{ink\.titleShadow\} \$\{ink\.text\}/g) ?? []).toHaveLength(2);
    // The online dot's ring follows the ground too.
    expect(pub).toMatch(/border-2 \$\{ink\.dotRing\}/);
  });
});

describe("the leave dialog", () => {
  it("states a consequence only for the host's delete", () => {
    expect(pub).toMatch(/\{removing\?\.my_state === "host" && \(\s*\n\s*<AlertDialogDescription>\{t\("extra\.rlDeleteRoomConfirm"\)\}<\/AlertDialogDescription>/);
    expect(pub).not.toMatch(/t\("extra\.rlLeaveRoomConfirm"\)/);
  });
});
