/**
 * The pale card, on both tabs, and an honest leave dialog.
 *
 * Owner's design: the gradient under a white wash, dark type on it, white
 * pills, a white bar — "dark texts on white, it is more visible". Every
 * room wears it, on the Public tab and on the private list alike, so the
 * two tabs match. Whether the viewer has been in a room is said by the
 * leave icon alone. And a guest leaving a public room is not told it will
 * vanish from the list, because it stays.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const pub = read("src/components/team/PublicRoomsSection.tsx");
const mine = read("src/components/team/MyRoomsSection.tsx");

describe("the pale card", () => {
  it("one ink, dark on a white wash, on the public card", () => {
    expect(pub).toMatch(/const ink = INK\.pale;/);
    expect(pub).toMatch(/text: "text-\[#2b1a4a\]",/);
    expect(pub).toMatch(/pill: "bg-white\/60 backdrop-blur-sm",/);
    expect(pub).toMatch(/const WASH = "absolute inset-0 bg-white\/55 pointer-events-none";/);
    expect(pub).toMatch(/<div className=\{WASH\} aria-hidden \/>/);
    expect(pub).toMatch(/const BAR = "bg-white\/60 backdrop-blur-md";/);
    expect(pub).toMatch(/rounded-2xl px-3 py-2\.5 flex items-center justify-between gap-2 \$\{BAR\}/);
    // No drop shadow under dark type, and the online dot rings in white.
    expect(pub).not.toMatch(/drop-shadow-md \$\{ink\.text\}/);
    expect(pub).toMatch(/bg-emerald-400 border-2 border-white/);
  });

  it("and the same on the private card, so the tabs match", () => {
    expect(mine).toMatch(/<div className="absolute inset-0 bg-white\/55 pointer-events-none" aria-hidden \/>/);
    expect(mine).toMatch(/rounded-full bg-white\/60 backdrop-blur-sm text-\[#2b1a4a\] font-bold text-xs/);
    expect(mine).toMatch(/<h3 className="font-display text-\[#2b1a4a\] text-lg leading-tight line-clamp-2">/);
    expect(mine).toMatch(/<p className="text-\[#2b1a4a\]\/70 text-sm truncate mt-0\.5">/);
    expect(mine).toMatch(/bg-white\/60 backdrop-blur-md rounded-2xl px-3 py-2\.5 flex items-center justify-between gap-2/);
    expect(mine).toMatch(/<Trash2 className="w-4 h-4 text-\[#2b1a4a\]" \/>/);
    expect(mine).toMatch(/<LogOut className="w-4 h-4 text-\[#2b1a4a\]" \/>/);
  });

  it("the same lip and proportions on both", () => {
    const lip = 'boxShadow: "0 4px 0 0 hsl(var(--border)), 0 6px 20px -4px rgba(0,0,0,0.1)"';
    expect(pub).toContain(lip);
    expect(mine).toContain(lip);
    expect(pub).toMatch(/aspect-\[1\.45\/1\] md:aspect-\[1\.15\/1\]/);
    expect(mine).toMatch(/aspect-\[1\.45\/1\] md:aspect-\[1\.15\/1\]/);
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
