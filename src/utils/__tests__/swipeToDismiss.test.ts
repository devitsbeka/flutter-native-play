import { describe, it, expect } from "vitest";
import {
  shouldDismissSwipe,
  SWIPE_THRESHOLD,
  FLICK_VELOCITY,
} from "@/utils/swipeToDismiss";

// The card used to be pinned at x:0 with dragElastic 0.1, so it crawled a
// tenth of the way while this decision was made on the finger's full travel:
// a 100px swipe moved the card 10px and deleted the row. The card now tracks
// the finger 1:1 within its constraints, which is what makes these thresholds
// mean what they look like — a row leaves only after the card itself has
// visibly travelled, or after a deliberate flick.

describe("swipe to dismiss", () => {
  it("keeps the row for a short, slow drag", () => {
    expect(shouldDismissSwipe(-20, -50)).toBe(false);
    expect(shouldDismissSwipe(-SWIPE_THRESHOLD + 1, 0)).toBe(false);
  });

  it("deletes once the card has travelled past the threshold", () => {
    expect(shouldDismissSwipe(-SWIPE_THRESHOLD - 1, 0)).toBe(true);
    expect(shouldDismissSwipe(-240, -100)).toBe(true);
  });

  it("deletes on a fast flick that did not travel far", () => {
    expect(shouldDismissSwipe(-40, -FLICK_VELOCITY - 1)).toBe(true);
  });

  it("never deletes on a rightward swipe", () => {
    expect(shouldDismissSwipe(120, 900)).toBe(false);
    expect(shouldDismissSwipe(30, 0)).toBe(false);
  });
});
