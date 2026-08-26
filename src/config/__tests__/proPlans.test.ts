import { describe, it, expect } from "vitest";
import { PRICES } from "@/config/pricing";
import { availablePlans, defaultPlan, PRO_PLANS } from "../proPlans";

/**
 * What the paywall is allowed to offer.
 *
 * `availablePlans` used to guarantee at least one row, falling back to the
 * monthly plan when StoreKit's catalogue came back empty. That reads as
 * defensive and is the opposite: an empty catalogue is exactly what an App
 * Review device sees while the products are unapproved or unattached to the
 * version, and the fallback row was then priced from a constant in the bundle
 * — in dollars, whatever the reviewer's storefront charges — behind a live
 * Subscribe button that could only fail.
 *
 * Empty means empty. The paywall renders a "store unavailable" state instead.
 */
describe("availablePlans on a device", () => {
  it("offers nothing when the store returned no catalogue", () => {
    expect(availablePlans([], true)).toEqual([]);
  });

  it("offers only what the store actually reported", () => {
    const monthly = PRO_PLANS.find((p) => p.id === "monthly")!;
    const plans = availablePlans([monthly.productId], true);

    expect(plans.map((p) => p.id)).toEqual(["monthly"]);
  });

  it("ignores a product id the app does not sell", () => {
    expect(availablePlans(["io.mytrivia.something.else"], true)).toEqual([]);
  });
});

describe("availablePlans on the web", () => {
  it("does not consult a store catalogue it has no access to", () => {
    // Stripe prices these, so an empty StoreKit list means nothing here.
    const plans = availablePlans([], false);
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      // Every row has a real figure in every currency the web charges in.
      // Rows used to carry their own `webGel`/`fallbackUsd`; the price now
      // comes from src/config/pricing.ts, which the checkout charges from.
      for (const currency of ["GEL", "USD", "EUR"] as const) {
        expect(
          PRICES[plan.priceKey]?.[currency],
          `${plan.id} would render with no price to show in ${currency}`
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("defaultPlan", () => {
  it("opens on the featured plan when it is on sale", () => {
    expect(defaultPlan(PRO_PLANS)?.id).toBe("annual");
  });

  it("falls to the first row when the featured plan is not available", () => {
    const monthlyOnly = PRO_PLANS.filter((p) => p.id === "monthly");
    expect(defaultPlan(monthlyOnly)?.id).toBe("monthly");
  });

  it("has nothing to open on when there are no plans", () => {
    expect(defaultPlan([])).toBeUndefined();
  });
});

/**
 * Free trials are the store's to declare. A plan carrying its own trial field
 * is the regression that put "Try 1 day free" on a product whose introductory
 * offer nobody had created.
 */
describe("the plan config", () => {
  it("does not declare free trials of its own", () => {
    for (const plan of PRO_PLANS) {
      expect(
        (plan as unknown as Record<string, unknown>).trialDays,
        `${plan.id} declares a trial — read it from IAPProduct.introFreeDays instead`
      ).toBeUndefined();
    }
  });
});
