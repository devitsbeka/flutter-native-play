import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The shop must not offer PRO to somebody whose subscription it has not read
 * yet.
 *
 * `currentTier` is `isVip ? subscription?.vip_tier : undefined`, and both are
 * their empty values until VipContext's first read lands. Every tier
 * therefore rendered as one to buy, with a live Subscribe button, during the
 * window after a sign-in — which is where this went wrong on a device:
 *
 *   "i logged out and logged in again and it initially showed me as
 *    non-pro... then i clicked on buy pro button on shop page and it showed
 *    ios dialogue saying i am already subscribed"
 *
 * A source-level guard rather than a rendering test: the reel is a
 * scroll-snap carousel with measurement, auto-advance and page-visibility
 * behaviour, and standing all of that up would test the carousel rather than
 * this rule. What is asserted is the thing that was missing — that the
 * button's enabled state consults the loading flag at all.
 */

const reel = readFileSync("src/components/shop/MobileProCarousel.tsx", "utf8");

describe("the PRO reel while the subscription is still unknown", () => {
  it("takes the loading flag from VipContext", () => {
    expect(
      reel,
      "the reel does not read whether the subscription has been loaded, so it " +
        "cannot tell 'not subscribed' from 'not known yet'",
    ).toMatch(/loading:\s*vipLoading/);
  });

  it("does not enable the buy button until then", () => {
    const disabled = reel.slice(reel.indexOf("actionDisabled="));
    expect(
      disabled.slice(0, 120),
      "the Subscribe button is live while the subscription is still being read",
    ).toContain("vipLoading");
  });
});
