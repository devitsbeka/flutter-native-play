import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The room card's seat row fits, and what gives way is a face.
 *
 * The private card's bottom bar spends its width on the host's label (a face
 * and a name, up to 110pt), then the guests' faces, then the "+N", then the
 * open seat, with the Play button holding the right-hand end. At five faces
 * that came to roughly 170pt of row in 152pt of space, and the thing the clip
 * reached first was the "+N" — so a room of seven showed every face it had
 * room for and a bare "+" with the number cut off (owner: "show max 3 avatars
 * to fit + button in that row, now it's cropped").
 *
 * Two things keep it fitting: three faces rather than five, and the count
 * moved out of the box that does the clipping. A clipped face still reads as
 * a face. A clipped number reads as nothing.
 */

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const source = read("src/components/team/MyRoomsSection.tsx");
const grid = source.slice(source.indexOf("export function RoomCardGrid("));

describe("how many faces a room card draws", () => {
  it("is three", () => {
    expect(source).toMatch(/^const ROOM_CARD_FACES = 3;$/m);
  });

  it("is one number, so no two layouts disagree about the same room", () => {
    // Every face row reads the constant; none carries a count of its own.
    expect(source.match(/slice\(0, ROOM_CARD_FACES\)/g)?.length).toBe(2);
    expect(grid).toMatch(/const avatarLimit = ROOM_CARD_FACES;/);
    expect(source).not.toMatch(/slice\(0, [45]\)\.map\(\(p/);
  });
});

describe("the seat row's overflow count", () => {
  const cluster = '<div className="flex -space-x-2 min-w-0 overflow-hidden p-1 -m-1">';

  it("sits outside the box that clips, so the number is never cut", () => {
    const start = grid.indexOf(cluster);
    const count = grid.indexOf("{guests.length > avatarLimit && (");
    expect(start).toBeGreaterThan(-1);
    expect(count).toBeGreaterThan(start);
    // The clipping div closes — at its own indentation, the row's — before
    // the count opens, and the count is nowhere inside it.
    const between = grid.slice(start, count);
    expect(between).toContain("\n                  </div>\n");
    expect(between).not.toMatch(/\+\{guests\.length - avatarLimit\}/);
  });

  it("keeps the overlap it had inside the cluster", () => {
    // The row's own gap-2 puts 8px back between them, so the pull has to
    // cover the gap and the overlap both.
    expect(grid).toMatch(/<div className="-ml-4 w-10 h-10 rounded-full border-2 border-white/);
  });

  it("still comes before the open seat, which stays last in the group", () => {
    const count = grid.indexOf("+{guests.length - avatarLimit}");
    const invite = grid.indexOf("{canInvite && (", count);
    expect(invite).toBeGreaterThan(count);
  });
});
