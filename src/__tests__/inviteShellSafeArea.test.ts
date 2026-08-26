import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * The invite screens paid for the safe area three times over.
 *
 * The stack, from the outside in:
 *
 *   #root              padding-top/bottom: var(--safe-top) / var(--safe-bottom)
 *   InviteShell outer  h-[100dvh] overflow-y-auto safe-bleed
 *   InviteShell inner  min-h-[100dvh] pt-[--safe-top+24] pb-[env(...)+20]
 *
 * `safe-bleed` cancels #root's inset with a negative margin and re-adds it as
 * padding, so the wash reaches the true edge of the screen — which means the
 * scrollport is 100dvh MINUS both insets. A child asking for min-h-[100dvh]
 * inside that overran by exactly their sum: 93px on an iPhone 15 Pro (59 top,
 * 34 bottom). Its own pt/pb then pushed the content down a third time.
 *
 * Measured in a 393x852 viewport with the insets stood in: the scroller
 * carried 93px of overflow, the accept button was cut in half and "I already
 * have an account" sat 36px below the fold. It scrolled — but nothing about a
 * screen with six elements on it suggests trying, so on TestFlight it read as
 * a broken button.
 *
 * min-h-full fills the scrollport rather than exceeding it. The two things
 * below are what a future edit would get wrong again.
 */
describe("the invite shell does not pay for the safe area twice", () => {
  const page = src("src/pages/InvitePage.tsx");

  const shell = page.slice(page.indexOf("function InviteShell"));

  it("sizes the inner column against the scrollport, not the viewport", () => {
    // The outer box is the scroller and SHOULD be a full-viewport box.
    expect(shell).toMatch(/h-\[100dvh\] overflow-y-auto safe-bleed/);

    // The inner column must not be, or it overflows by both insets.
    const inner = shell.slice(shell.indexOf("max-w-[520px]") - 400);
    expect(
      inner,
      "the inner column must be min-h-full: min-h-[100dvh] inside a " +
        "safe-bleed scroller overflows by safe-top + safe-bottom",
    ).toMatch(/min-h-full/);
  });

  it("adds no safe-area padding of its own inside safe-bleed", () => {
    // safe-bleed already re-applied both insets on the scroller. Anything
    // here is the third application.
    const inner = shell.slice(shell.indexOf('<div className="relative mx-auto'));
    const attr = inner.slice(0, inner.indexOf(">"));
    expect(attr).not.toMatch(/safe-area-inset/);
    expect(attr).not.toMatch(/var\(--safe-top\)/);
    expect(attr).not.toMatch(/var\(--safe-bottom\)/);
  });

  /**
   * The loading and not-found screens are not inside safe-bleed — they sit
   * directly in #root, which is already inset — so a 100dvh box there is
   * taller than the space it has by the same 93px, with no scroller to
   * recover it.
   */
  it("sizes the loading and not-found screens to the inset viewport", () => {
    const beforeShell = page.slice(0, page.indexOf("function InviteShell"));
    const fullHeight = [...beforeShell.matchAll(/className="h-\[100dvh\][^"]*"/g)];
    expect(
      fullHeight.map((m) => m[0]),
      "a bare h-[100dvh] outside safe-bleed overruns #root's inset",
    ).toEqual([]);

    expect(beforeShell).toMatch(
      /h-\[calc\(100dvh-var\(--safe-top\)-var\(--safe-bottom\)\)\]/,
    );
  });
});
