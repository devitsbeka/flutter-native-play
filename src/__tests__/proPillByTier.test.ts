/**
 * The PRO pill says what the tier makes true.
 *
 * "Try PRO" to a player without PRO; "Upgrade" to a solo PRO, who can step
 * up to Friends PRO; "Send PRO" to a Friends PRO holder, who has seats to
 * give (owner: "if user has no pro we show try pro, upgrade when user
 * already has pro solo and can upgrade to friends pro, and if user has
 * friends pro sees send pro"). One helper decides, from the subscription,
 * and the chooser wears the same button as the balance row instead of a
 * copy that said "Upgrade" to a player with no PRO at all.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { proCtaChoice, proSeatsTotal, proTierOf } from "@/utils/proTier";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("proTierOf", () => {
  it("none without PRO, whatever the row says", () => {
    expect(proTierOf(null, false)).toBe("none");
    expect(proTierOf({ vip_tier: "pro_plus" }, false)).toBe("none");
  });

  it("solo for PRO and for a seat somebody gave — a seat carries no seats of its own", () => {
    expect(proTierOf({ vip_tier: "pro" }, true)).toBe("solo");
    expect(proTierOf({ vip_tier: "standard" }, true)).toBe("solo");
    expect(proTierOf({ vip_tier: "pro_plus", purchase_platform: "seat" }, true)).toBe("solo");
    expect(proTierOf({ vip_tier: null }, true)).toBe("solo");
  });

  it("friends for the tiers that carry five seats", () => {
    expect(proTierOf({ vip_tier: "pro_plus" }, true)).toBe("friends");
    expect(proTierOf({ vip_tier: "pro_master", purchase_platform: "revenuecat" }, true)).toBe("friends");
  });
});

describe("the chooser", () => {
  it("wears the shared button, not its own copy", () => {
    const chooser = read("src/components/team/CreateRoomPage.tsx");
    expect(chooser).toMatch(/<ProCtaButton onClick=\{\(\) => setShowProModal\(true\)\} \/>/);
    expect(chooser).not.toMatch(/t\(blockedByLimit \? "extra\.tryProBtn" : "extra\.upgradeBtn"\)/);
  });
});

describe("what the pill offers this hour", () => {
  const EVEN = 2 * 3_600_000 + 1000;
  const ODD = 3 * 3_600_000 + 1000;

  it("the trial without PRO, and Send PRO to a Friends PRO, whatever the hour", () => {
    expect(proCtaChoice("none", 0, EVEN)).toBe("try");
    expect(proCtaChoice("none", 5, ODD)).toBe("try");
    expect(proCtaChoice("friends", 5, EVEN)).toBe("send");
    expect(proCtaChoice("friends", 0, ODD)).toBe("send");
  });

  it("a solo PRO with the seat unspent: Send PRO one hour, Upgrade the next", () => {
    expect(proCtaChoice("solo", 1, EVEN)).toBe("send");
    expect(proCtaChoice("solo", 1, ODD)).toBe("upgrade");
  });

  it("a solo PRO whose seat is spent: Upgrade, every hour", () => {
    expect(proCtaChoice("solo", 0, EVEN)).toBe("upgrade");
    expect(proCtaChoice("solo", 0, ODD)).toBe("upgrade");
  });

  it("seats to give: one for PRO, five for Friends PRO, none for a seat somebody gave", () => {
    expect(proSeatsTotal({ vip_tier: "pro" }, true)).toBe(1);
    expect(proSeatsTotal({ vip_tier: "pro_plus" }, true)).toBe(5);
    expect(proSeatsTotal({ vip_tier: "pro_plus", purchase_platform: "seat" }, true)).toBe(0);
    expect(proSeatsTotal({ vip_tier: "pro" }, false)).toBe(0);
  });
});

describe("the seats card", () => {
  const section = read("src/components/profile/ProSeatsSection.tsx");

  it("explains itself in two lines, not three", () => {
    expect(section).toMatch(/className="mx-auto max-w-\[40ch\] text-\[13px\] leading-\[18px\] text-muted-foreground text-center"/);
  });

  it("its rows wear the chunky gift pill: purple to send, grey once sent", () => {
    expect(section).toMatch(/const SEAT_PILL =/);
    expect(section).toMatch(/cn\(SEAT_PILL, "border-\[#b78cf2\] bg-\[linear-gradient/);
    expect(section).toMatch(/cn\(SEAT_PILL, "border-\[#9aa39e\] bg-\[linear-gradient/);
    expect(section).toMatch(/\{t\("extra\.proSeatsSentBadge"\)\}/);
    for (const lang of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(read(`src/locales/${lang}.ts`), lang).toMatch(/proSeatsSentBadge: "[^"]+",/);
    }
    // Taking a seat back is still possible, under the holder's name.
    expect(section).toMatch(/onClick=\{\(\) => void revoke\(seat\.holderId\)\}/);
  });
});
