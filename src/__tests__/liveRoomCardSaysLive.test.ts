/**
 * A room with a round running says "Live" first, and pulses.
 *
 * A player who left the lobby before the countdown, or whose phone slept
 * through it, came back to a list where the room looked exactly as before
 * — "New", the count, the faces — while the others were already answering.
 * Now the private cards lead with a pulsing "Live" pill and drop "New"
 * while it is up (owner: "show live label instead new label on room card
 * and show first, make it pulsing a little for more visibility").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const mine = read("src/components/team/MyRoomsSection.tsx");
const grid = mine.slice(mine.indexOf("export function RoomCardGrid("));
const rail = mine.slice(mine.indexOf("export function RoomCard("), mine.indexOf("export function RoomCardGrid("));

describe("the Live badge", () => {
  it("is one component, red, breathing, with a pinging dot", () => {
    expect(mine).toMatch(/function LiveBadge\(/);
    expect(mine).toMatch(/animate=\{\{ scale: \[1, 1\.06, 1\] \}\}\s*\n\s*transition=\{\{ duration: 1\.4, repeat: Infinity, ease: "easeInOut" \}\}/);
    expect(mine).toMatch(/rounded-full bg-\[#ff4d6d\] px-2\.5 py-1 text-xs font-bold text-white/);
    expect(mine).toMatch(/animate-ping rounded-full bg-white\/80/);
    expect(mine).toMatch(/\{t\("extra\.roomStatusLive"\)\}/);
  });

  it("is read off the room's status, the same rule the Play button pulses on", () => {
    expect(mine).toMatch(/import \{ useMyRooms, MyRoom, RoomFilter, isActiveTVSession, isRoomLive \} from "@\/hooks\/useMyRooms";/);
  });
});

describe("the private grid card", () => {
  it("leads its top row with Live, before the seats, and hides New meanwhile", () => {
    expect(grid).toMatch(/const isLive = isRoomLive\(room\);/);
    expect(grid).toMatch(/const isNew = useRoomIsNew\(room\.created_at\) && !isLive;/);
    const live = grid.indexOf("{isLive && <LiveBadge />}");
    const seats = grid.indexOf('<Users className="w-3.5 h-3.5 text-[#2b1a4a]" />');
    expect(live).toBeGreaterThan(-1);
    expect(live).toBeLessThan(seats);
  });
});

describe("the rail card", () => {
  it("shows Live where New would be, Live winning", () => {
    expect(rail).toMatch(/const isLive = isRoomLive\(room\);/);
    expect(rail).toMatch(/const isNew = useRoomIsNew\(room\.created_at\) && !isLive;/);
    expect(rail).toMatch(/\{isLive \? \(\s*\n\s*<LiveBadge \/>\s*\n\s*\) : isNew \? \(/);
  });
});

describe("the word", () => {
  it("is in all seven languages", () => {
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/\n\s+roomStatusLive: "[^"]+",/);
    }
  });
});
