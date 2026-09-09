/**
 * The rematch wait sheet: the faces have room for their rings, and the
 * buttons are the preview sheet's pair.
 *
 * The table's list scrolls when it is long, and a scroller clips to its
 * padding box — the ring around each face is a 2px shadow OUTSIDE the
 * face's box, so with no padding the top of every ring was cut flat
 * (owner: "make sure avatar is not cropped, top is not visible, needs
 * space above"). The padding is the ring's room.
 *
 * Cancel and Start were ChunkyButton's purple outline and purple fill, a
 * pair no other sheet in the rooms flow wears. They are the preview sheet's
 * now: Cancel the unfilled pill, Start the mint one every button one tap
 * from a game wears, with the play triangle (owner: "show this button with
 * stroke and green button on this modal too").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const wait = read("src/components/team/RematchWaitSheet.tsx");

describe("the table", () => {
  it("pads its scroller so the rings are not clipped", () => {
    expect(wait).toMatch(/<ul className="mb-4 flex max-h-\[232px\] flex-wrap items-start justify-center gap-x-3 gap-y-4 overflow-y-auto px-2 pt-2 pb-1">/);
  });
});

describe("the buttons", () => {
  it("are the card's pills: Cancel outlined, Start mint with the play triangle", () => {
    expect(wait).toMatch(/import \{ RoomCardPlayButton \} from "@\/components\/team\/RoomCardPlayButton";/);
    expect(wait).toMatch(/import \{ PREVIEW_BUTTON_CLASS \} from "@\/components\/team\/RoomPreviewSheet";/);
    expect(wait).toMatch(/<RoomCardPlayButton tone="outline" className=\{`\$\{PREVIEW_BUTTON_CLASS\} flex-none`\} onClick=\{onCancel\} disabled=\{starting\}>/);
    expect(wait).toMatch(/tone="mint"\s*\n\s*className=\{`\$\{PREVIEW_BUTTON_CLASS\} min-w-0 whitespace-nowrap px-3`\}\s*\n\s*onClick=\{onStart\}\s*\n\s*disabled=\{starting \|\| ready === 0\}/);
  });

  it("are not split down the middle: Cancel hugs its word, Start takes the rest on one line", () => {
    // "დაწყება 1 მოთამაშით" at half the row wrapped to two lines (owner:
    // "show start with 1 player on one row and reduce cancel button to
    // fit"). The shared class is flex-1; Cancel overrides it to flex-none
    // and Start refuses to wrap.
    expect(wait).toMatch(/\$\{PREVIEW_BUTTON_CLASS\} flex-none`\} onClick=\{onCancel\}/);
    expect(wait).toMatch(/\$\{PREVIEW_BUTTON_CLASS\} min-w-0 whitespace-nowrap px-3`\}/);
    expect(wait).toMatch(/<Play className="h-3\.5 w-3\.5 fill-current" \/>\s*\n\s*\{t\("extra\.rematchWaitStart", \{ count: playing \}\)\}/);
    expect(wait).not.toMatch(/ChunkyButton/);
  });
});
