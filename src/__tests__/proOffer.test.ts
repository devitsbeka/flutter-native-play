import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { PRO_PLANS, availablePlans, annualSaving, friendSeats } from "@/config/proPlans";
import { PRICES } from "@/config/pricing";
import { translations } from "@/locales";

const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * The offer, and the two places it has to agree with itself.
 *
 *   Monthly        4.99 GEL / month   PRO + 1 friend
 *   PRO + friends  9.99 GEL / month   PRO + 5 friends
 *   Annual        59.88 GEL / year    PRO + 5 friends
 *
 * A plan's seat count is not written on the plan. `pro_seat_allowance` in the
 * database grants 1 to the `pro` tier and 5 to `pro_plus`, so the row's TIER
 * is what decides how many friends it carries — which is the one thing here
 * that could be wrong without anything failing to compile, and would sell
 * five seats and hand over one.
 */
describe("what each PRO plan costs and how many friends it carries", () => {
  const plan = (id: string) => {
    const found = PRO_PLANS.find((p) => p.id === id);
    if (!found) throw new Error(`no plan ${id}`);
    return found;
  };

  it("prices the three plans in lari as the offer says", () => {
    expect(PRICES[plan("monthly").priceKey].GEL).toBe(4.99);
    expect(PRICES[plan("friends").priceKey].GEL).toBe(9.99);
    expect(PRICES[plan("annual").priceKey].GEL).toBe(59.88);
  });

  it("leaves dollars and euro on the App Store tiers", () => {
    // Lari is priced for the home market; nothing else moves with it.
    expect(PRICES.pro_monthly.USD).toBe(3.99);
    expect(PRICES.pro_monthly.EUR).toBe(3.99);
    expect(PRICES.pro_plus_monthly.USD).toBe(7.99);
    expect(PRICES.pro_plus_monthly.EUR).toBe(7.99);
  });

  it("gives one friend to monthly and five to the other two, via the tier", () => {
    expect(plan("monthly").tier).toBe("pro");
    expect(plan("friends").tier).toBe("pro_plus");
    // The year carries friends too — this is the one that was `pro`.
    expect(plan("annual").tier).toBe("pro_plus");
  });

  it("bills the two monthly plans monthly and the year yearly", () => {
    expect(plan("monthly").months).toBe(1);
    expect(plan("friends").months).toBe(1);
    expect(plan("annual").months).toBe(12);
  });

  /**
   * The seat allowance lives in SQL, so this reads it rather than trusting a
   * comment: if somebody regrades the tiers there, the tier choice above stops
   * meaning what this file says it means.
   */
  it("matches the seat allowance the database actually grants", () => {
    const sql = src("supabase/migrations/20260821130000_pro_seats_block_only_real_pro.sql");
    expect(sql).toContain("WHEN p_tier IN ('pro_plus', 'pro_master') THEN 5");
    expect(sql).toContain("WHEN p_tier IN ('pro', 'standard') THEN 1");

    // And the number the paywall PRINTS comes from friendSeats, so it has to
    // read the same. This is the pair that would otherwise drift silently:
    // the SQL is the rule, friendSeats is only a mirror of it.
    expect(friendSeats("pro_plus")).toBe(5);
    expect(friendSeats("pro")).toBe(1);
  });

  /**
   * The invite benefit is the one line on the list that changes with the row
   * you have selected, so it is the one that can advertise the wrong number.
   * Every plan must resolve to a count, and it must be the count its tier
   * actually carries.
   */
  it("names the right number of friends for whichever row is selected", () => {
    expect(friendSeats(plan("monthly").tier)).toBe(1);
    expect(friendSeats(plan("friends").tier)).toBe(5);
    expect(friendSeats(plan("annual").tier)).toBe(5);
  });

  /**
   * The footnote under the buy button states the price and the billing period,
   * and it is the line App Review reads the price off. It used to look up
   * `paywall.period_${plan.id}`, which worked only for as long as every plan
   * id happened to be a period: adding the `friends` row printed
   * "9.99 ₾ / paywall.period_friends" to real users.
   *
   * So: every plan must resolve to a period word that exists, in every
   * language.
   */
  it("resolves a real period word for every plan in every language", () => {
    for (const code of Object.keys(translations)) {
      const paywall = (translations as Record<string, { paywall: Record<string, string> }>)[code]
        .paywall;

      for (const p of PRO_PLANS) {
        const key = p.months >= 12 ? "period_annual" : "period_monthly";
        const word = paywall[key];
        expect(word, `${code}.paywall.${key} is missing (plan ${p.id})`).toBeTruthy();
        expect(word, `${code}.paywall.${key} leaks a key name`).not.toContain("paywall.");
      }
    }
  });

  it("has the invite benefit copy in every language, singular and plural", () => {
    for (const code of Object.keys(translations)) {
      const paywall = (translations as Record<string, { paywall: Record<string, string> }>)[code]
        .paywall;

      expect(paywall.benefitInviteTitle, `${code} has no benefitInviteTitle`).toBeTruthy();

      // One friend gets its own string rather than "{count} friends" with a 1
      // substituted, which reads wrong in all seven.
      expect(paywall.benefitInviteBlurbOne, `${code} has no singular blurb`).toBeTruthy();
      expect(paywall.benefitInviteBlurbOne).not.toContain("{count}");

      // The plural MUST carry the placeholder: without it the paywall renders
      // a fixed number that ignores the plan.
      expect(
        paywall.benefitInviteBlurb,
        `${code}.paywall.benefitInviteBlurb must contain {count}`,
      ).toContain("{count}");
    }
  });

  /**
   * The client shows a price and the checkout charges from its own copy of
   * the table. They were three different numbers once — see the header of
   * src/config/pricing.ts — and the rule since is that the figure shown is
   * the figure taken.
   */
  it("charges what it shows: the server mirror carries the same lari", () => {
    const server = src("supabase/functions/_shared/pricing.ts");
    expect(server).toContain("pro_monthly: { GEL: 4.99");
    expect(server).toContain("pro_plus_monthly: { GEL: 9.99");
    expect(server).toContain("pro_annual: { GEL: 59.88");
  });

  /**
   * Moving the year onto pro_plus moved which row of the server's tier table
   * prices it, and pro_plus had no yearly row. A tier without one bills
   * MONTHLY — the function logs a warning and charges tier.monthly — so the
   * buyer who picked the 59.88 year would have been put on a 9.99 monthly
   * subscription instead, at a price they were never shown.
   */
  it("has a yearly line for the tier the annual plan is sold under", () => {
    const checkout = src("supabase/functions/create-pro-checkout/index.ts");
    const proPlus = checkout.slice(checkout.indexOf("pro_plus: {"));
    expect(proPlus).toContain('yearly: { priceKey: "pro_annual"');
    expect(proPlus.slice(0, proPlus.indexOf("};"))).not.toContain("yearly: null");
  });

  /**
   * The same choice again on the other rail. On a phone nothing above is
   * consulted: the receipt names a product id and _shared/iap.ts decides the
   * tier it writes to vip_subscriptions, which is what pro_seat_allowance
   * then reads. Left at `pro`, an iOS annual buyer gets one seat.
   */
  it("grants the annual product the same tier on the App Store rail", () => {
    const iap = src("supabase/functions/_shared/iap.ts");
    expect(iap).toContain(
      '[PRODUCTS.PRO_ANNUAL]: { kind: "subscription", tier: "pro_plus" }',
    );
  });

  it("no longer tells a Georgian buyer the year is half the monthly rate", () => {
    // In lari it is not: 59.88 a year IS 4.99 a month. What the year buys
    // here is the four extra seats.
    const server = src("supabase/functions/_shared/pricing.ts");
    expect(server).not.toContain("half the monthly rate");
    expect(server).not.toContain("ორჯერ იაფად");
  });

  it("offers all three on the web, where there is no store catalogue", () => {
    const web = availablePlans([], false);
    expect(web.map((p) => p.id).sort()).toEqual(["annual", "friends", "monthly"]);
  });

  it("hides a plan the App Store has never heard of", () => {
    // A row for a product StoreKit does not return opens a payment sheet and
    // fails, which reads as the app being broken.
    const onDevice = availablePlans([plan("monthly").productId], true);
    expect(onDevice.map((p) => p.id)).toEqual(["monthly"]);
  });

  it("compares the year against the plan that carries the same friends", () => {
    // annualSaving looks for a monthly plan of the SAME tier. With the year on
    // pro_plus that is the 9.99 row, not the 4.99 one — so the year is sold as
    // saving 60 lari against twelve months of PRO + friends, which is the
    // comparison that carries the same five seats.
    const priceOf = (p: typeof PRO_PLANS[number]) => PRICES[p.priceKey].GEL;
    expect(annualSaving(plan("annual"), priceOf)).toBeCloseTo(60, 2);
    expect(annualSaving(plan("monthly"), priceOf)).toBeNull();
  });
});
