/**
 * The lobby shows what is happening, and where to act.
 *
 * Owner's asks, in one round: a gradient stroke drifting around the
 * category chip and the + for the host, so the way to add a round is found
 * without looking; a flash on everyone's chip and a popping "+N" as rounds
 * are added; the round list as a dropdown over a blurred lobby rather than
 * a page; "joined" / "left" beside a name for a moment; and the chip row
 * held still while the body scrolls.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const universal = read("src/components/lobby/UniversalLobby.tsx");
const room = read("src/components/team/RoomLobbyV2.tsx");
const modal = read("src/components/team/RoundOrderModal.tsx");
const css = read("src/index.css");

describe("the ring", () => {
  it("is a masked, drifting gradient stroke, still under Reduce Motion", () => {
    expect(css).toMatch(/\.lobby-ring \{[\s\S]*?background-size: 300% 300%;[\s\S]*?animation: lobby-ring-drift 3\.6s ease-in-out infinite;[\s\S]*?mask-composite: exclude;/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*\.lobby-ring \{ animation: none; \}/);
    expect(css).toMatch(/\.lobby-ring-flash \{\s*\n\s*animation: lobby-ring-drift 3\.6s ease-in-out infinite, lobby-ring-flash 1\.6s ease-out forwards;/);
  });

  it("stays lit on the host's chip and +, and flashes for everyone as the round count changes", () => {
    expect(universal).toMatch(/<Ring on=\{!!category\.glow\} flashKey=\{category\.rounds\} className="min-w-0 flex-1">\s*\n\s*<Chip/);
    expect(universal).toMatch(/<Ring on=\{!!category\.glow\} className="shrink-0">\s*\n\s*<motion\.button/);
    // A flash only after the first snapshot: the count as found is not an addition.
    expect(universal).toMatch(/if \(seen\.current === undefined\) \{\s*\n\s*seen\.current = flashKey;\s*\n\s*return;/);
    expect(room).toMatch(/rounds,\s*\n\s*glow: isHost,/);
  });

  it("and the +N pops as it changes", () => {
    expect(universal).toMatch(/<AnimatePresence mode="popLayout" initial=\{false\}>\s*\n\s*\{trailing && \(\s*\n\s*<motion\.span\s*\n\s*key=\{trailing\}/);
  });
});

describe("the round list drops under the chip", () => {
  it("over a blurred lobby that closes on a tap, not on a page of its own", () => {
    expect(universal).toMatch(/categoryMenu\?: \{ open: boolean; onClose: \(\) => void; children: ReactNode \};/);
    expect(universal).toMatch(/onClick=\{categoryMenu\.onClose\}\s*\n\s*className="absolute inset-0 z-30 bg-\[rgba\(60,30,90,0\.22\)\] backdrop-blur-\[6px\]"/);
    expect(universal).toMatch(/className="absolute left-4 right-4 top-full z-40 mt-2 flex max-h-\[60dvh\] flex-col overflow-hidden rounded-\[22px\]/);
    expect(modal).not.toMatch(/fixed inset-0 safe-screen z-\[120\]/);
    expect(room).toMatch(/categoryMenu=\{\{\s*\n\s*open: showRoundOrder,/);
  });

  it("the chip row is outside the scroller, so it stays put", () => {
    const row = universal.indexOf("The category row, OUTSIDE the scroller");
    const body = universal.indexOf('className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden"');
    expect(row).toBeGreaterThan(-1);
    expect(row).toBeLessThan(body);
    expect(universal).toMatch(/className="relative z-40 mx-auto mt-\[9px\] w-full max-w-\[700px\] shrink-0 px-4 md:max-w-\[520px\]"/);
  });
});

describe("joined and left", () => {
  it("a note beside the name for a moment, springing in", () => {
    expect(universal).toMatch(/note\?: "joined" \| "left";/);
    expect(universal).toMatch(/\{player\.note === "joined" \? joinedLabel : leftLabel\}/);
    expect(universal).toMatch(/player\.note === "joined" \? "bg-\[#10b981\]\/15 text-\[#10b981\]" : "bg-\[#402666\]\/10 text-\[#402666\]\/60"/);
  });

  it("the room lobby marks arrivals and departures, and keeps a departed row a moment", () => {
    expect(room).toMatch(/const SEAT_NOTE_MS = 3500;/);
    expect(room).toMatch(/newParticipants\.forEach\(\(id\) => next\.set\(id, "joined"\)\);\s*\n\s*gone\.forEach\(\(id\) => next\.set\(id, "left"\)\);/);
    expect(room).toMatch(/note: seatNotes\.get\(p\.user_id\),/);
    expect(room).toMatch(/players=\{\[\.\.\.lobbyPlayers, \.\.\.departedPlayers\]\}/);
    expect(room).toMatch(/joined: t\("lobby\.uJoinedNote"\),\s*\n\s*left: t\("lobby\.uLeftNote"\),/);
  });

  it("in all seven languages, Georgian as asked", () => {
    expect(read("src/locales/ka.ts")).toMatch(/uJoinedNote: "შემოგვიერთდა",\s*\n\s*uLeftNote: "გავიდა",/);
    for (const lang of ["en", "de", "es", "fr", "it", "pt"]) {
      const locale = read(`src/locales/${lang}.ts`);
      expect(locale, lang).toMatch(/uJoinedNote: "/);
      expect(locale, lang).toMatch(/uLeftNote: "/);
    }
  });
});
