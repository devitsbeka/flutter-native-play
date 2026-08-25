import { describe, it, expect } from "vitest";
import { introFreeDays } from "../introOffer";

/**
 * The paywall's free-trial promise is now read off the store product, so this
 * function is the thing standing between App Store Connect and a sentence the
 * app puts on screen. Getting it wrong in either direction costs something:
 * too eager and the app advertises a trial StoreKit will not grant (2.3.1);
 * too shy and a real trial goes unmentioned.
 */
describe("introFreeDays", () => {
  it("has nothing to say about a product with no introductory offer", () => {
    expect(introFreeDays(null)).toBeUndefined();
    expect(introFreeDays(undefined)).toBeUndefined();
  });

  it("reads the offer the annual plan is meant to carry", () => {
    expect(
      introFreeDays({ price: 0, periodUnit: "DAY", periodNumberOfUnits: 1, cycles: 1 })
    ).toBe(1);
  });

  it("converts weeks, months and years", () => {
    expect(introFreeDays({ price: 0, periodUnit: "WEEK", periodNumberOfUnits: 1, cycles: 1 })).toBe(7);
    expect(introFreeDays({ price: 0, periodUnit: "MONTH", periodNumberOfUnits: 1, cycles: 1 })).toBe(30);
    expect(introFreeDays({ price: 0, periodUnit: "YEAR", periodNumberOfUnits: 1, cycles: 1 })).toBe(365);
  });

  it("multiplies by the number of cycles", () => {
    expect(
      introFreeDays({ price: 0, periodUnit: "WEEK", periodNumberOfUnits: 1, cycles: 3 })
    ).toBe(21);
  });

  it("treats a missing or zero cycle count as one", () => {
    expect(introFreeDays({ price: 0, periodUnit: "DAY", periodNumberOfUnits: 3 })).toBe(3);
    expect(
      introFreeDays({ price: 0, periodUnit: "DAY", periodNumberOfUnits: 3, cycles: 0 })
    ).toBe(3);
  });

  it("refuses a discounted introductory offer — that is not a free trial", () => {
    // RevenueCat reports pay-up-front and pay-as-you-go offers through the
    // same field. Calling a cheap first month "free" is the same misstatement
    // as inventing a trial outright.
    expect(
      introFreeDays({ price: 0.99, periodUnit: "MONTH", periodNumberOfUnits: 1, cycles: 1 })
    ).toBeUndefined();
  });

  it("refuses anything it cannot read confidently", () => {
    expect(introFreeDays({ price: 0, periodUnit: "FORTNIGHT", periodNumberOfUnits: 1 })).toBeUndefined();
    expect(introFreeDays({ price: 0, periodUnit: "DAY", periodNumberOfUnits: 0 })).toBeUndefined();
    expect(introFreeDays({ price: 0, periodNumberOfUnits: 1 })).toBeUndefined();
    // A product with no price field at all is not an offer worth announcing.
    expect(introFreeDays({ periodUnit: "DAY", periodNumberOfUnits: 1 })).toBeUndefined();
  });

  it("accepts the unit in either case", () => {
    expect(introFreeDays({ price: 0, periodUnit: "day", periodNumberOfUnits: 2 })).toBe(2);
  });
});
