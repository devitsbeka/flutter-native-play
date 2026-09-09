import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The claimed gift is grey, not faded.
 *
 * With nothing to claim the home hero's gift goes still and grey — the
 * countdown's other half. It was ALSO drawn at 45% opacity, so the glass
 * card's border ran straight through the box (owner: "make sure we show
 * gift icon grey colored when it is claimed not transparent, container
 * lines behind the icon is visible now"). Desaturated and a shade darker
 * now, fully opaque: grey says "claimed"; see-through said "broken".
 */
const hero = readFileSync(join(process.cwd(), "src/components/home/MobileHome.tsx"), "utf8");

describe("the gift with nothing to claim", () => {
  it("is desaturated and darkened, at full opacity", () => {
    expect(hero).toMatch(/\$\{canClaimGift \? "" : "grayscale brightness-\[\.82\]"\}/);
  });

  it("is never see-through", () => {
    const giftSpan = hero.slice(hero.indexOf("canClaimGift ? GIFT_IDLE.animate"), hero.indexOf("src={giftDaily}"));
    expect(giftSpan).not.toMatch(/opacity-\d+/);
  });

  it("still stands still while grey", () => {
    expect(hero).toMatch(/animate=\{canClaimGift \? GIFT_IDLE\.animate : \{ rotate: 0, y: 0 \}\}/);
  });
});
