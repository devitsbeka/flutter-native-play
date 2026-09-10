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
import { proTierOf } from "@/utils/proTier";

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
