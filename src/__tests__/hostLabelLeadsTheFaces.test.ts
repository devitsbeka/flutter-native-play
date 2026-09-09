/**
 * The host leads the seats row as a label, and is not drawn twice.
 *
 * The public card named the host in the top-left pill (face, crown, name)
 * and then drew the same face again as the first seat on the row below;
 * the private card crowned the first face in its cluster. Owner: "show
 * host label instead in top left - as first on room cards with username
 * (same label) and then invited/joined friends avatars (don't show host
 * avatar twice, label would mean that player is in room as a host)".
 *
 * So on both cards the seats row opens with the host's label — the same
 * pill, moved down — and the faces after it are the guests only. The top
 * row keeps "New" and the counts.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const pub = read("src/components/team/PublicRoomsSection.tsx");
const mine = read("src/components/team/MyRoomsSection.tsx");
const grid = mine.slice(mine.indexOf("export function RoomCardGrid("));

describe("public card", () => {
  const header = pub.slice(
    pub.indexOf("{/* Top: who runs it, who already joined, and how full it is */}"),
    pub.indexOf("{/* Middle: the room, and the round it plays first */}"),
  );
  const seats = pub.slice(pub.indexOf("{(seatsToDraw > 0 || canInvite) && ("), pub.indexOf("{canInvite && ("));

  it("the top row no longer names the host", () => {
    expect(header).not.toMatch(/openProfile\(room\.host_user_id\)/);
    expect(header).not.toMatch(/crownIcon/);
  });

  it("the seats row opens with the host label — face, crown, name, the online dot — before the loop", () => {
    const label = seats.indexOf("openProfile(room.host_user_id)");
    const loop = seats.indexOf("Array.from({ length: seatsToDraw }");
    expect(label).toBeGreaterThan(-1);
    expect(label).toBeLessThan(loop);
    // The crown sits on the face's ring now (cardFacesMatch.test).
    expect(seats).toMatch(/<img src=\{crownIcon\} alt="" className="pointer-events-none absolute -top-2 left-1\/2 z-10 w-\[18px\] h-\[18px\] -translate-x-1\/2 object-contain drop-shadow-sm" \/>/);
    expect(seats).toMatch(/\{room\.host_nickname \|\| t\("extra\.friendFallback"\)\}/);
    expect(seats).toMatch(/\{online\.has\(room\.host_user_id\) && \(/);
  });

  it("and the loop skips the host's seat, so the face is not drawn twice", () => {
    expect(seats).toMatch(/if \(i === 0\) return null;/);
    expect(seats).toMatch(/const person: CardPlayer \| undefined = players\[i - 1\] \?\? \(reservedForMe \? me : undefined\);/);
    expect(seats).not.toMatch(/avatar_url: room\.host_avatar_url,\s*\n\s*\}\s*\n\s*: players/);
  });
});

describe("private card", () => {
  it("splits the host from the guests", () => {
    expect(grid).toMatch(/const cardHost = displayPlayers\.find\(\(p\) => p\.is_host\) \?\? null;/);
    expect(grid).toMatch(/const guests = displayPlayers\.filter\(\(p\) => !p\.is_host\);/);
  });

  it("the host is a label before the cluster, the cluster is guests only", () => {
    const label = grid.indexOf("{cardHost && (");
    const cluster = grid.indexOf('<div className="flex -space-x-2 min-w-0 overflow-hidden p-1 -m-1">');
    expect(label).toBeGreaterThan(-1);
    expect(label).toBeLessThan(cluster);
    expect(grid).toMatch(/\{guests\.slice\(0, avatarLimit\)\.map\(\(p, idx\) => \{/);
    expect(grid).toMatch(/\{guests\.length > avatarLimit && \(/);
    expect(grid).toMatch(/\{cardHost\.nickname \|\| t\("extra\.friendFallback"\)\}/);
    // No crown overlay on a cluster face any more: the crown is on the label.
    expect(grid).not.toMatch(/\{p\.is_host && \(\s*\n\s*<img\s*\n\s*src=\{crownIcon\}/);
  });
});
