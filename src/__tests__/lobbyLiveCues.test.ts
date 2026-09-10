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
    // All purple, turning slowly: a conic gradient of the lobby's own
    // purples, one turn in 9s, faint halo. (It was pink and sky blue at
    // 300% in 3.6s — a shimmer.)
    expect(css).toMatch(/@property --lobby-ring-angle \{\s*\n\s*syntax: "<angle>";/);
    expect(css).toMatch(/\.lobby-ring \{[\s\S]*?conic-gradient\(\s*\n\s*from var\(--lobby-ring-angle\),[\s\S]*?animation: lobby-ring-drift 9s linear infinite;[\s\S]*?mask-composite: exclude;/);
    const ring = css.slice(css.indexOf(".lobby-ring {"), css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .lobby-ring"));
    expect(ring).not.toMatch(/f472b6|7dd3fc|c084fc/);
    expect(ring).toMatch(/box-shadow: 0 0 10px rgba\(136, 88, 213, 0\.18\);/);
    // 1px, laid over the chip's own border: the same weight as the rule
    // boxes below, not a heavier band outside it.
    expect(ring).toMatch(/padding: 1px;/);
    // The ring's radius has to match the chip's own asymmetric 24/24/24/54
    // corner exactly, or the two curves trace different paths and the
    // chip's own border shows past the ring — a stray line behind the chip.
    expect(universal).toMatch(
      /className=\{cn\("lobby-ring pointer-events-none absolute inset-0 z-10", CHIP_RADIUS\)\}/,
    );
    expect(universal).toMatch(
      /const CHIP_RADIUS = "rounded-bl-\[24px\] rounded-br-\[54px\] rounded-tl-\[24px\] rounded-tr-\[24px\]";/,
    );
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*\.lobby-ring \{ animation: none; \}/);
    // No flash variant any more: the "+N" pop is the cue for a round added.
    expect(css).not.toMatch(/lobby-ring-flash/);
    expect(universal).not.toMatch(/flashKey/);
  });

  it("is lit on the host's chip only until a category is picked", () => {
    // ONE ring now, around one pill (Figma 1123:8843). The + used to be a
    // slab of its own beside the chip and wore a second ring; both the
    // slab and its ring are gone — the + is inside the pill this ring
    // already goes around.
    expect(universal).toMatch(/<Ring on=\{!!category\.glow\} className="min-w-0">\s*\n\s*<Chip/);
    expect((universal.match(/<Ring on=/g) ?? []).length).toBe(1);
    // The chip fills the ring: the ring is a flex box (flex-1 on the chip
    // means nothing under a block) and the chip is w-full.
    expect(universal).toMatch(/<div className=\{cn\("relative flex", className\)\}>/);
    expect(universal).toMatch(/CHIP_RADIUS,\s*\n\s*"relative flex h-\[63px\] w-full min-w-0 flex-1 items-center border-2/);
    // While the round list is open the + is an X that closes it.
    expect(universal).toMatch(/onClick=\{categoryMenu\?\.open \? categoryMenu\.onClose : category\.onAdd\}/);
    expect(universal).toMatch(/aria-label=\{categoryMenu\?\.open \? "close" : "add category"\}/);
    expect(universal).toMatch(/\{categoryMenu\?\.open \? \(\s*\n\s*<X className="h-6 w-6 text-\[#402666\]" strokeWidth=\{2\.6\} \/>/);
    // Host only, and only while there is still a category to pick.
    expect(room).toMatch(/glow: isHost && needsCategorySelection,/);
    expect(room).not.toMatch(/rounds,\s*\n\s*glow:/);
  });

  it("and the +N pops as it changes — the one cue everyone gets", () => {
    expect(universal).toMatch(/<AnimatePresence mode="popLayout" initial=\{false\}>\s*\n\s*\{trailing && \(\s*\n\s*<motion\.span\s*\n\s*key=\{trailing\}/);
  });
});

describe("the round list drops under the chip", () => {
  it("over a blurred lobby that closes on a tap, not on a page of its own", () => {
    expect(universal).toMatch(/categoryMenu\?: \{ open: boolean; onClose: \(\) => void; children: ReactNode \};/);
    expect(universal).toMatch(/onClick=\{categoryMenu\.onClose\}\s*\n\s*className="absolute inset-0 z-30 bg-\[rgba\(60,30,90,0\.22\)\] backdrop-blur-\[6px\]"/);
    expect(universal).toMatch(/className="absolute left-4 right-4 top-full z-40 mt-2 flex max-h-\[calc\(100dvh_-_var\(--safe-top,0px\)_-_var\(--safe-bottom,0px\)_-_145px\)\] flex-col overflow-hidden rounded-\[22px\]/);
    expect(modal).not.toMatch(/fixed inset-0 safe-screen z-\[120\]/);
    expect(room).toMatch(/categoryMenu=\{\{\s*\n\s*open: showRoundOrder,/);
  });

  it("the chip row is outside the scroller, so it stays put", () => {
    const row = universal.indexOf("The category row, OUTSIDE the scroller");
    // The body now runs up under the chip by a measured clearance
    // (lobbyTopHaze.test); the row is still outside it in the tree.
    const body = universal.indexOf('className="relative z-10 mt-[calc(var(--chip-clearance)*-1)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overflow-anchor:none]"');
    expect(row).toBeGreaterThan(-1);
    expect(row).toBeLessThan(body);
    expect(universal).toMatch(/className="relative z-40 mx-auto mt-\[13px\] w-full max-w-\[700px\] shrink-0 px-\[28px\] md:max-w-\[520px\]"/);
  });
});

describe("left, and no longer joined", () => {
  it("the note is a departure only", () => {
    // Superseded. The arrival note is gone (owner's ask): the avatar already
    // says it — an invited seat is grey and turns full colour on arrival —
    // and it was firing on the wrong event besides. See lobbyArrivalNote.
    expect(universal).toMatch(/note\?: "left";/);
    expect(universal).toMatch(/\{leftLabel\}/);
    expect(universal).not.toMatch(/joinedLabel/);
  });

  it("the room lobby marks departures, and keeps a departed row a moment", () => {
    expect(room).toMatch(/const SEAT_NOTE_MS = 3500;/);
    expect(room).toMatch(/gone\.forEach\(\(id\) => next\.set\(id, "left"\)\);/);
    expect(room).toMatch(/note: seatNotes\.get\(p\.user_id\),/);
    expect(room).toMatch(/players=\{\[\.\.\.lobbyPlayers, \.\.\.departedPlayers\]\}/);
    expect(room).toMatch(/left: t\("lobby\.uLeftNote"\),/);
    expect(room).not.toMatch(/joined: t\("lobby\.uJoinedNote"\)/);
  });

  it("in all seven languages, Georgian as asked", () => {
    const ka = read("src/locales/ka.ts");
    expect(ka).toMatch(/uLeftNote: "გავიდა",/);
    for (const lang of ["en", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/uLeftNote: "/);
    }
  });
});

describe("one close, not two", () => {
  it("the round list has no X of its own — the + beside the chip is the X while it is open", () => {
    const header = modal.slice(modal.indexOf('{t("lobby.uRoundsTitle")}') - 400, modal.indexOf('{t("lobby.uRoundsTitle")}') + 200);
    expect(header).not.toMatch(/<X /);
    expect(header).toMatch(/flex flex-col items-center px-4 pb-2 pt-3/);
  });
});
