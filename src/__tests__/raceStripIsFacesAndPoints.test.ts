/**
 * The in-game strip is faces and points, and nothing else.
 *
 * It carried four things per player: an avatar, a place ring, a gold/silver/
 * bronze trophy on the rim, and a name beside the score. The owner's ask:
 * drop the trophies and the names.
 *
 * Both were saying something the entry already said, badly. The trophy
 * repeated the ring's colour while covering the picture it hung on — a 19px
 * badge on the rim of a 32px circle. The name was 10px and truncated: at four
 * players it read "Sal…", which identifies nobody, and past five it was not
 * drawn at all.
 *
 * The one thing they carried that the ring did NOT is which avatar is yours,
 * and only while you were off the podium — `podium?.ring ?? (isMe ? …)` gave
 * a player in the top three the place colour and nothing personal, with the
 * word "You" doing that work. So the self ring is now drawn OUTSIDE the place
 * ring rather than instead of it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const strip = read("src/components/game/LiveRaceStrip.tsx");

describe("what the strip no longer draws", () => {
  it("no trophies, and no trophy art imported", () => {
    expect(strip).not.toMatch(/trophy-(gold|silver|bronze)\.png/);
    expect(strip).not.toMatch(/trophyGold|trophySilver|trophyBronze/);
    expect(strip).not.toMatch(/podium\.trophy/);
    // The place ring is what says who is winning now, so it stays.
    expect(strip).toMatch(/const PODIUM = \[\s*\n\s*\{ ring: "#F5B921" \},/);
  });

  it("no names, and no translator left over to render one", () => {
    expect(strip).not.toMatch(/t\("game\.you"\)/);
    expect(strip).not.toMatch(/useLanguage/);
    // `nickname` survives in exactly one place — the avatar's fallback
    // initial, which is the picture, not a label. Anywhere else is a name
    // back on the strip.
    expect(strip.match(/player\.nickname/g) ?? []).toHaveLength(1);
    expect(strip).toMatch(/fallback=\{player\.nickname\}/);
  });

  it("and the wrapper that existed only to hang the trophy is gone", () => {
    expect(strip).not.toMatch(/<div className="relative">/);
  });
});

describe("what it draws instead", () => {
  it("the avatar, and the score under or beside it", () => {
    expect(strip).toMatch(/<SmartAvatar/);
    expect(strip).toMatch(/\{score\}/);
  });

  it("with your own ring drawn around the place ring, not in place of it", () => {
    // Without this a player in the top three has nothing marking them at
    // all: their ring is the podium colour like everybody else's, and the
    // name that used to say "You" is gone.
    expect(strip).toMatch(/`0 0 0 2px \$\{podium\?\.ring \?\? PACK_RING\}`/);
    expect(strip).toMatch(/isMe \? `0 0 0 4px \$\{SELF_RING\}` : null,/);
    expect(strip).not.toMatch(/podium\?\.ring \?\? \(isMe \? SELF_RING : PACK_RING\)/);
  });

  it("and the space the name gave up goes to the number", () => {
    expect(strip).toMatch(/sideways \? "text-\[13px\]" : "text-\[12px\]"/);
    // The 72px slot was a name's; an avatar over a number does not need it.
    expect(strip).toMatch(/roomy \|\| podium \? "w-\[46px\]" : "w-\[30px\]"/);
    expect(strip).not.toMatch(/roomy \? "w-\[72px\]"/);
  });
});

describe("the race still reads as a race", () => {
  it("ordered by score, and every entry keeps its identity so it can move", () => {
    expect(strip).toMatch(/export function rankPlayers/);
    expect(strip).toMatch(/layout\n/);
    expect(strip).toMatch(/key=\{player\.id\}/);
  });

  it("and a score change is still animated", () => {
    expect(strip).toMatch(/key=\{score\}/);
    expect(strip).toMatch(/initial=\{\{ scale: 1\.35, opacity: 0\.6 \}\}/);
  });
});
