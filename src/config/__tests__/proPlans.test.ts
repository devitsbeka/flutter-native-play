import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
 * Free trials, and who is allowed to promise one.
 *
 * This used to assert that no plan declared a trial at all, because the
 * paywall once advertised "Try 1 day free" from a constant while App Store
 * Connect had no introductory offer configured — a claim only Apple could
 * honour, made by a file Apple never reads.
 *
 * The rule is now split by platform rather than absolute:
 *
 *   native → the trial is whatever `IAPProduct.introFreeDays` reports, so a
 *            number here cannot make StoreKit grant anything
 *   web    → the app owns the offer, and `create-pro-checkout` grants it
 *
 * Which moves the risk rather than removing it: the client and the edge
 * function deploy through different pipelines, so the two numbers can drift
 * and the paywall would advertise days Stripe does not give. That is what
 * this pins.
 */
describe("the web trial", () => {
  const checkout = readFileSync(
    join(process.cwd(), "supabase/functions/create-pro-checkout/index.ts"),
    "utf8",
  );

  it("matches what create-pro-checkout actually grants", () => {
    const declared = PRO_PLANS.find((p) => p.months >= 12)?.trialDays;
    // Guard against the test passing because both sides are absent.
    expect(declared, "the annual plan no longer advertises a trial").toBe(3);
    const granted = Number(
      checkout.match(/const TRIAL_DAYS_YEARLY = (\d+);/)?.[1] ?? NaN,
    );

    expect(
      granted,
      "TRIAL_DAYS_YEARLY is gone from create-pro-checkout — the paywall's " +
        "trial badge would be advertising an offer nothing grants"
    ).not.toBeNaN();

    expect(
      declared ?? 0,
      `the annual plan advertises ${declared ?? 0} free days and Stripe grants ` +
        `${granted}. Change both, and deploy the function first.`
    ).toBe(granted);
  });

  it("is only ever on a yearly plan", () => {
    // The offer is on the year. A monthly plan carrying one would be granted
    // by the interval check in create-pro-checkout, not by this field.
    for (const plan of PRO_PLANS.filter((p) => p.months < 12)) {
      expect(
        plan.trialDays,
        `${plan.id} declares a trial, but create-pro-checkout only grants one ` +
          "on a yearly interval — the badge would never be honoured"
      ).toBeUndefined();
    }
  });

  it("is applied to the subscription rather than the line item", () => {
    // trial_period_days on subscription_data is what makes Stripe defer the
    // first charge; anywhere else it is silently ignored.
    expect(checkout).toMatch(/subscription_data:[\s\S]{0,400}trial_period_days/);
  });
});
