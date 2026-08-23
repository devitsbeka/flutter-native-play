import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The subscription disclosure has to be on iOS, and only on iOS.
 *
 * Apple's Guideline 3.1.2 wants the auto-renewal terms, the billing account,
 * how to cancel, and links to Terms and Privacy beside any button that starts
 * a subscription. Shipping a paywall without it is a stock metadata
 * rejection — that is why SubscriptionTerms exists at all.
 *
 * It is equally wrong on the web. The copy names the iTunes/Apple ID account
 * and the App Store's subscription settings, and a web purchase goes through
 * Stripe Checkout, which states its own terms before charging. So the
 * component renders on native and nowhere else, and both halves of that are
 * worth pinning: dropping the gate puts App Store wording next to a Stripe
 * button, and dropping the component puts the app back in front of review
 * with nothing there.
 *
 * Asserted against the source because there is no component-render harness in
 * this project. What matters is that the gate and the call sites exist.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("the subscription disclosure", () => {
  const source = read("src/components/shared/SubscriptionTerms.tsx");

  it("renders only in the native app", () => {
    expect(
      source,
      "the disclosure names the Apple ID account and App Store settings — on web it is simply untrue"
    ).toMatch(/Capacitor\.isNativePlatform\(\)/);
    expect(
      source,
      "the non-native branch must render nothing at all"
    ).toMatch(/if \(!Capacitor\.isNativePlatform\(\)\) return null;/);
  });

  it("still carries everything Apple asks for", () => {
    // Renewal terms, the billing account, how to cancel, and both links.
    for (const key of [
      "extra.autoRenewalDesc",
      "extra.paymentDesc",
      "extra.cancellationDesc",
      "extra.termsLink",
      "extra.privacyLink",
    ]) {
      expect(source, `missing ${key} — 3.1.2 wants all of it`).toContain(key);
    }
    expect(source).toMatch(/to=\{`\/terms/);
    expect(source).toMatch(/to=\{`\/privacy-policy/);
  });
});

/**
 * Every surface that can start a subscription must render it.
 *
 * These three are the ones with a buy button wired to useProPurchase. A
 * fourth appearing without the disclosure is the regression this catches.
 */
describe("surfaces that can start a subscription", () => {
  it.each([
    "src/components/shop/MobileProCarousel.tsx",
    "src/components/shop/ShopRightSidebar.tsx",
    "src/components/shared/ProRequiredModal.tsx",
  ])("%s renders the disclosure", (path) => {
    const source = read(path);
    expect(source, "expected the SubscriptionTerms import").toMatch(/SubscriptionTerms/);
    expect(
      source,
      "the component must actually be rendered, not merely imported"
    ).toMatch(/<SubscriptionTerms/);
  });
});
