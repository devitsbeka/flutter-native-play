/**
 * The balance row says the whole number, and sells PRO at its right end.
 *
 * "7.8K" stood for anything from 7 750 to 7 849 coins; a player reading the
 * shop's row to see what they can afford was reading a rounding. The pills
 * say 7 850 now (owner: "show coins fully, for example like 7 850 instead
 * 7,8"). And the row's right end carries the chooser's green PRO pill: Try
 * PRO for a player without PRO, Upgrade for a solo PRO, nothing for PRO+
 * (owner: "show on the right side in coin/gems row - Try PRO or Upgrade
 * button if user is non pro - sees Try PRO or solo pro sees - Upgrade").
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatFullNumber } from "@/lib/utils";
import { proCtaLabelKey } from "@/components/shared/BalanceStrip";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const strip = read("src/components/shared/BalanceStrip.tsx");

describe("the whole number", () => {
  it("groups thousands with a no-break space", () => {
    expect(formatFullNumber(7850)).toBe("7\u00a0850");
    expect(formatFullNumber(161500)).toBe("161\u00a0500");
    expect(formatFullNumber(1234567)).toBe("1\u00a0234\u00a0567");
  });

  it("leaves small and odd numbers alone", () => {
    expect(formatFullNumber(0)).toBe("0");
    expect(formatFullNumber(999)).toBe("999");
    expect(formatFullNumber(10.7)).toBe("10");
    expect(formatFullNumber(-2500)).toBe("-2\u00a0500");
  });

  it("is what both pills show — the compact form is gone from the row", () => {
    expect(strip).toMatch(/\{formatFullNumber\(coins\)\}/);
    expect(strip).toMatch(/\{formatFullNumber\(gems\)\}/);
    expect(strip).not.toMatch(/formatCompactNumber/);
  });
});

describe("the PRO button", () => {
  it("says Try PRO to a player without PRO, Upgrade to a solo PRO, Send PRO to a Friends PRO", () => {
    expect(proCtaLabelKey("none")).toBe("extra.tryProBtn");
    expect(proCtaLabelKey("solo")).toBe("extra.upgradeBtn");
    expect(proCtaLabelKey("friends")).toBe("extra.proSeatsSend");
  });

  it("sits at the right end of the strip and opens the paywall", () => {
    expect(strip).toMatch(/<ProCtaButton onClick=\{\(\) => setPaywallOpen\(true\)\} \/>/);
    expect(strip).toMatch(/className=\{\s*\n\s*sends\s*\n\s*\? "relative ml-auto flex h-\[43px\]/);
    // Portalled: the strip is a backdrop-filter surface in a sticky header,
    // which would pin a `fixed` sheet to itself instead of the screen.
    expect(strip).toMatch(/createPortal\(<ProPaywallModal isOpen=\{paywallOpen\} onClose=\{\(\) => setPaywallOpen\(false\)\} \/>, document\.body\)/);
  });

  it("reads the tier from the VIP context, not from a guess", () => {
    expect(strip).toMatch(/const \{ isVip, subscription \} = useVipStatus\(\);/);
    expect(strip).toMatch(/const tier = proTierOf\(subscription, isVip\);/);
    // Send PRO goes to the seats panel, not the paywall, in purple with the gift.
    expect(strip).toMatch(/onClick=\{sends \? \(\) => navigate\(PRO_SEATS_PATH\) : onClick\}/);
    expect(strip).toMatch(/\{sends && <img alt="" src=\{giftIcon\}/);
  });
});
