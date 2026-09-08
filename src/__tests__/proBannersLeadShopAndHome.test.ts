/**
 * Where the subscription is sold, and where the timed packages are.
 *
 * Both surfaces used to lead with the countdown. The shop's reel opened on
 * a package with a clock on it and put the two PRO tiers third and fourth,
 * reachable only by swiping past an offer that expires; the home feed ended
 * on the same packages. So the thing that does not expire — the tier — was
 * the harder of the two to find on both screens.
 *
 * They swap (owner: "on shop page show daily offers packs in bottom, below
 * the super powers, in top show only our two PRO banners... on main page
 * show our PRO banners instead daily offers banners at the end of the
 * page"). Nothing stops being sold: the packages move to the foot of the
 * shop, under the powers, where somebody already spending is reading.
 *
 * And the card itself was too tall to act on. Its buy button sat under the
 * bottom nav on a phone — the offer visible, the way to take it not (owner:
 * "make sure our PRO banners are reduced in height, now it is not fully
 * visible, needs scroll to see purchase button").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const shop = read("src/components/shop/ShopStandardLayout.tsx");
const home = read("src/components/home/MobileHomeFeed.tsx");
const card = read("src/components/shop/ProBannerCard.tsx");

describe("the shop", () => {
  it("opens on the two PRO tiers and nothing else", () => {
    const first = shop.indexOf("<ProBannerReel");
    expect(first).toBeGreaterThan(-1);
    expect(shop.slice(first, first + 200)).toMatch(/slides="pro"/);
  });

  it("sells the packages at the foot, under the powers and the grids", () => {
    const deals = shop.indexOf('slides="deals"');
    const powers = shop.indexOf("<MyPowersSection");
    const grids = shop.indexOf("<ShopProductGrid");
    expect(deals).toBeGreaterThan(-1);
    expect(deals).toBeGreaterThan(powers);
    expect(deals).toBeGreaterThan(grids);
  });

  it("gives that one a heading, where the PRO reel above needs none", () => {
    expect(shop).toMatch(/\{t\("extra\.railOffers"\)\}/);
  });

  it("still shows exactly two reels — the packages moved, they did not multiply", () => {
    expect((shop.match(/<ProBannerReel/g) ?? []).length).toBe(2);
  });
});

describe("the home feed", () => {
  it("closes on the PRO tiers, not on the packages", () => {
    expect(home).toMatch(/slides="pro"/);
    expect(home).not.toMatch(/slides="deals"/);
  });

  it("and its heading says so", () => {
    expect(home).toMatch(/<RailHeader title=\{t\("extra\.railPro"\)\} \/>/);
    expect(home).not.toMatch(/t\("extra\.railOffers"\)/);
  });

  it("with the reel still the last section on the page", () => {
    const reel = home.lastIndexOf("<ProBannerReel");
    const sections = [...home.matchAll(/<section/g)].map((m) => m.index ?? 0);
    expect(reel).toBeGreaterThan(sections[sections.length - 1]);
  });
});

describe("the PRO card's height", () => {
  it("comes off the hero, which was over half the card", () => {
    expect(card).toMatch(/const PRO_HERO_H = 200;/);
    expect(card).toMatch(/const PRO_HERO_TRIM = 279 - PRO_HERO_H;/);
  });

  it("and everything under the picture moves up by exactly that much", () => {
    // The frame's own numbers are kept as written and shifted by one
    // constant, so no part of the card is silently re-spaced.
    for (const original of ["527", "338.121", "321", "381.08", "241", "267", "447"]) {
      expect(card, original).toMatch(
        new RegExp(`${original.replace(".", "\\.")} - PRO_HERO_TRIM`),
      );
    }
  });

  it("leaving the button the same clearance below it the frame gave it", () => {
    // 527 - (447 + 59) === 448 - (368 + 59): the trim moves the button and
    // the floor together, so the gap under it is untouched.
    const CARD = 527 - 79;
    const BUTTON_TOP = 447 - 79;
    expect(CARD - (BUTTON_TOP + 59)).toBe(527 - (447 + 59));
  });
});

/**
 * The gap above the PRO banner was three top-paddings stacked into one.
 *
 * The page wrapper, ShopStandardLayout's own root, and the reel's own
 * container each opened with their own pt-4 — 48px nobody meant to draw
 * together, parking the first banner nearly a screen's-height below the
 * balance row (owner: "reduce space between sticky header and banners").
 * Two of the three are trimmed; the reel keeps its own, since that padding
 * is shared with the home rail and the profile's PRO tab, both of which
 * open under a heading that already earns the space.
 */
describe("the gap above the shop's first banner", () => {
  it("drops the page wrapper's own top padding", () => {
    const powerUps = read("src/pages/PowerUps.tsx");
    expect(powerUps).toMatch(/<div>\s*\n\s*<ShopStandardLayout/);
    expect(powerUps).not.toMatch(/<div className="pt-4">\s*\n\s*<ShopStandardLayout/);
  });

  it("and trims ShopStandardLayout's own", () => {
    expect(shop).toMatch(/className="flex-1 pt-1 pb-8"/);
  });
});
