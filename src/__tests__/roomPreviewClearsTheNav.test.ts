/**
 * The room preview sheet is drawn on <body>, so the bottom nav cannot
 * cover it.
 *
 * The sheet is `fixed inset-0 z-[120]` and the nav is `z-50`, which looks
 * decided until you notice where the sheet is written: inside the home's
 * feed, which MobileHomeScroll wraps in `relative z-10`. A positioned
 * element with a z-index starts a stacking context, so the sheet's 120
 * only ranks it against its siblings INSIDE that wrapper, and the wrapper
 * itself is a 10 against the nav's 50 — the nav drew over the sheet, its
 * green play button across the middle of it (owner: "nav bar covering
 * modal when i click on room cards on main page, fix it").
 *
 * A portal to <body> leaves every ancestor stacking context behind. It is
 * what the other overlays these sections open already do: GameModal
 * portals (NotEnoughCoinsModal), InviteFriendsModal portals, and the
 * Radix dialogs portal by default. The preview sheet was the one that did
 * not — on both tabs' cards and the home rail alike, since they all open
 * this one component.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const sheet = read("src/components/team/RoomPreviewSheet.tsx");
const scroll = read("src/components/home/MobileHomeScroll.tsx");
const nav = read("src/components/layout/UniversalBottomNav.tsx");

describe("the preview sheet", () => {
  it("portals to the body, guarded for a document-less render", () => {
    expect(sheet).toMatch(/import \{ createPortal \} from "react-dom";/);
    expect(sheet).toMatch(/const sheet = \(\s*\n\s*<AnimatePresence>/);
    expect(sheet).toMatch(/return typeof document === "undefined" \? sheet : createPortal\(sheet, document\.body\);/);
  });

  it("still carries the stacking it always had, now against the page itself", () => {
    expect(sheet).toMatch(/className="fixed inset-0 z-\[120\]/);
    expect(nav).toMatch(/className="fixed bottom-0 left-0 right-0 z-50 overflow-visible"/);
  });
});

describe("the wrapper that trapped it is still there", () => {
  it("the home's feed panel is a stacking context of its own", () => {
    // Not a thing to remove: the panel's z-10 is what puts it over the
    // scene behind it. The sheet simply must not be ranked inside it.
    expect(scroll).toMatch(/className="relative z-10 min-h-full bg-\[#faf6ff\]"/);
  });
});
