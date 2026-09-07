import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * An overlay opened from inside a card has to be portalled out of it.
 *
 * `backdrop-filter`, `filter`, `transform` and `content-visibility` all create
 * a containing block. A `position: fixed` descendant of one resolves against
 * that element instead of the viewport — so a full-screen sheet opened from a
 * room card gets clipped to the card, the backdrop stops covering the screen,
 * and the page paints straight through the middle of the panel.
 *
 * That is what the report sheet did on device: opened from a room card whose
 * header carries `backdrop-blur-sm`, it rendered as a transparent strip with
 * the room list showing through it.
 *
 * `e2e/overlay-containment.spec.ts` covers the same class of bug on public
 * routes. It missed this one because the sheet only opens behind a tap on a
 * card that renders for a signed-in player, which the smoke tests never are.
 * Hence this: cheap, and it does not need a session.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * Overlays that are mounted inside a card rather than at the router root.
 *
 * The rule is about where a thing is *rendered from*, not what it looks like:
 * a modal mounted by a page is fine, because a page is not a containing
 * block. Add to this list whenever an overlay is opened from a feed item, a
 * room card, or anything else that blurs or transforms.
 */
const MOUNTED_INSIDE_CARDS = [
  "src/components/social/ReportBlockSheet.tsx",
];

describe("overlays opened from inside a card escape it", () => {
  for (const file of MOUNTED_INSIDE_CARDS) {
    it(`${file.split("/").pop()} portals to the body`, () => {
      const source = read(file);
      expect(
        source,
        "this overlay is opened from inside a blurred card, so a fixed " +
          "position resolves against the card — it must be portalled",
      ).toMatch(/createPortal\(/);
    });
  }

  it("the room card that opens it really does create a containing block", () => {
    // If this ever stops being true the portal is merely harmless rather than
    // load-bearing, and the test above would be pinning nothing.
    const card = read("src/components/team/PublicRoomsSection.tsx");
    expect(card).toMatch(/backdrop-blur/);
  });

  it("the feed item that opens it does too", () => {
    const feed = read("src/components/social/PlayerFeedItem.tsx");
    expect(feed).toMatch(/backdrop-blur/);
  });
});
