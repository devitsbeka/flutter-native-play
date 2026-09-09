/**
 * Two lobby fixes from one screenshot (owner's ask).
 *
 * A guest could not see a way out: the only leave was behind their own row
 * on the Players tab, and the back arrow, which reads as "go back" rather
 * than "leave this room". A Leave button sits above "Invite the host" now,
 * opening the same confirm the row did (exit and keep, or leave for good).
 *
 * And the "+1" on the category chip - the count of rounds beyond the first
 * - hung at the far end as a faded bare number, which looked like a stray
 * glyph. It is a tinted pill now, like the lobby's other counts.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const lobby = read("src/components/team/RoomLobbyV2.tsx");
const universal = read("src/components/lobby/UniversalLobby.tsx");

describe("a guest can leave from the lobby footer", () => {
  it("a Leave button above the footer's own button, for guests only", () => {
    const extra = lobby.slice(lobby.indexOf("footerExtra={"), lobby.indexOf("start={", lobby.indexOf("footerExtra={")));
    expect(extra).toMatch(/!isHost \? \(/);
    expect(extra).toMatch(/onClick=\{\(\) => setShowLeaveConfirm\(true\)\}/);
    expect(extra).toMatch(/\{t\("team\.leaveRoom"\)\}/);
    expect(extra).toMatch(/<LogOut className="mr-2 h-4 w-4" \/>/);
  });

  it("through the existing confirm, which still offers both ways out", () => {
    const modal = lobby.slice(lobby.indexOf("{showLeaveConfirm && ("));
    expect(modal).toMatch(/onClick=\{handleExitRoom\}/);
    expect(modal).toMatch(/onClick=\{handleLeavePermanently\}/);
  });

  it("the footer renders the extra above the button", () => {
    const footer = universal.slice(universal.indexOf("{footerExtra}"));
    expect(footer.indexOf("{footerExtra}")).toBeLessThan(footer.indexOf("onClick={start.onPress}"));
  });

  it("in every language", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+leaveRoom: "[^"]+",/);
    }
  });
});

describe("the chip's +N is a pill", () => {
  it("tinted, rounded, on the Nunito count face - not a faded bare number", () => {
    const from = universal.indexOf("key={trailing}");
    const span = universal.slice(from, universal.indexOf("</motion.span>", from));
    expect(span).toMatch(/rounded-full bg-\[#7126d5\]\/10 px-2\.5 font-\[Nunito\] text-\[13px\] font-bold leading-none text-\[#7126d5\]/);
    expect(span).not.toMatch(/text-\[#402666\]\/60/);
  });
});
