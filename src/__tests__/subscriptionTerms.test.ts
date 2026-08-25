import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

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
 * The list is **derived, not written down**. It used to name three files, with
 * a comment saying "a fourth appearing without the disclosure is the
 * regression this catches" — and then two more appeared (ProPaywallModal and
 * PlayLimitModal, both with live buy buttons and no renewal terms on them)
 * and the test passed the whole time, because a hardcoded list only ever
 * checks the surfaces somebody remembered to add to it.
 *
 * So the surfaces are whatever calls `useProPurchase`, found by walking the
 * tree. A new paywall is caught the moment it is written.
 */
function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      out.push(...tsxFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

/** Files whose buy button starts an auto-renewing subscription. */
function subscriptionSurfaces(): string[] {
  const src = join(process.cwd(), "src");
  return tsxFiles(src)
    .filter((file) => /useProPurchase/.test(readFileSync(file, "utf8")))
    .map((file) => relative(process.cwd(), file))
    .sort();
}

describe("surfaces that can start a subscription", () => {
  const surfaces = subscriptionSurfaces();

  it("finds the surfaces at all", () => {
    // A refactor that renames the hook would otherwise empty the list and
    // turn every assertion below into a vacuous pass.
    expect(
      surfaces.length,
      "no file imports useProPurchase — has the hook been renamed?"
    ).toBeGreaterThanOrEqual(4);
  });

  it.each(surfaces)("%s renders the disclosure", (path) => {
    const source = read(path);
    expect(source, "expected the SubscriptionTerms import").toMatch(/SubscriptionTerms/);
    expect(
      source,
      "the component must actually be rendered, not merely imported"
    ).toMatch(/<SubscriptionTerms/);
  });
});
