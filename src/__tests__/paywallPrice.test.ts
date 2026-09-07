import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Every surface that can start a subscription must print the price and the
 * billing period.
 *
 * Guideline 3.1.2 asks for both **on the screen with the button**, not in the
 * payment sheet that opens after it. `src/components/shared/SubscriptionTerms`
 * is the other half of the same requirement and has its own test next door —
 * but the terms state how renewal works and never name a figure, so a paywall
 * can pass that test with its price missing entirely.
 *
 * That is exactly what shipped. PlayLimitModal rendered art, a limit message,
 * two benefit rows, a green "Become PRO" button wired straight to
 * `initiateProCheckout("pro")` — the StoreKit sheet, on iOS, with no
 * confirmation step in between — and then the renewal terms. No price, no
 * period, anywhere on the card. Every other paywall in the app showed both,
 * which is why nobody noticed.
 *
 * The surfaces are **derived, not listed**, for the same reason
 * subscriptionTerms.test.ts derives them: a written-down list only ever checks
 * the paywalls somebody remembered to add to it, and the hardcoded list in
 * that file is precisely how PlayLimitModal went unchecked. Anything calling
 * `useProPurchase` is a paywall and is checked here from the moment it is
 * written.
 *
 * Asserted against the source, as there is no component-render harness in this
 * project.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

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

/**
 * Files whose buy button starts an auto-renewing subscription.
 *
 * The hook must actually be **called**, not merely named. subscriptionTerms
 * .test.ts next door matches the bare word `useProPurchase` anywhere in the
 * file, and that is a hair-trigger: two shop components picked up a comment
 * saying "the same rule `useProPurchase.storeReady` applies" and were promptly
 * required to render subscription renewal terms on a gem pack. Requiring the
 * call site keeps a cross-reference in a comment from redefining what a
 * paywall is.
 */
function subscriptionSurfaces(): string[] {
  const src = join(process.cwd(), "src");
  return tsxFiles(src)
    .filter((file) => /useProPurchase\s*\(/.test(readFileSync(file, "utf8")))
    .map((file) => relative(process.cwd(), file))
    .sort();
}

/**
 * The ways this app writes a billing period beside a price.
 *
 * `monthLabel()` is the shared "/mo" · "/თვე" suffix; `paywall.perMonth` and
 * `extra.perMonthShort` are locale strings that wrap or abbreviate it; and
 * `periodKeyFor` derives "month" or "year" from a plan's length — see
 * src/config/proPlans.ts, where it exists because a hardcoded
 * `paywall.period_${plan.id}` once printed a raw translation key next to a
 * price.
 *
 * A new surface may add a sixth spelling. Add it here with the same care:
 * what is being asserted is that a reader can tell how often they will be
 * charged, not that a particular helper was called.
 */
const PERIOD_EXPRESSIONS = [
  /monthLabel\s*\(/,
  /paywall\.perMonth/,
  /extra\.perMonthShort/,
  /periodKeyFor/,
  /paywall\.period_/,
];

describe("surfaces that can start a subscription", () => {
  const surfaces = subscriptionSurfaces();

  it("finds the surfaces at all", () => {
    // A rename of the hook would otherwise empty the list and turn every
    // assertion below into a vacuous pass.
    expect(
      surfaces.length,
      "no file imports useProPurchase — has the hook been renamed?",
    ).toBeGreaterThanOrEqual(4);
  });

  it.each(surfaces)("%s asks the store for a price", (path) => {
    const source = read(path);
    expect(
      source,
      "a paywall must resolve its price through useStorePrice — StoreKit's " +
        "own localized string on a device, the pricing table on the web. A " +
        "figure written into the component is wrong in every storefront but " +
        "one (guideline 2.3.1).",
    ).toMatch(/useStorePrice/);
    expect(
      source,
      "useStorePrice is imported but its resolved `.display` is never read, " +
        "so nothing reaches the screen",
    ).toMatch(/\.display/);
  });

  it.each(surfaces)("%s prints the price next to the button", (path) => {
    const source = read(path);
    // The resolved display string has to reach JSX. Either interpolated
    // directly ({price.display}), passed to a child (price={x.display}), or
    // substituted into a locale string (.replace("{price}", ...)).
    const rendered =
      /\{[^}]*\.display\}/.test(source) ||
      /=\{[^}]*\.display\}/.test(source) ||
      /replace\(\s*["'`]\{price\}["'`]/.test(source);
    expect(
      rendered,
      "the price is resolved but never rendered. PlayLimitModal opened the " +
        "StoreKit sheet from a button with no figure anywhere on the card — " +
        "guideline 3.1.2 wants the price on the screen, before the tap.",
    ).toBe(true);
  });

  it.each(surfaces)("%s says how often it renews", (path) => {
    const source = read(path);
    expect(
      PERIOD_EXPRESSIONS.some((re) => re.test(source)),
      "a price with no period is not a subscription price — say /mo, /yr or " +
        "the locale's own wording beside it. Known spellings are listed in " +
        "PERIOD_EXPRESSIONS in this file.",
    ).toBe(true);
  });

  it.each(surfaces)("%s keeps its buy button shut when the store is silent", (path) => {
    const source = read(path);
    // The other half of showing a real price: when StoreKit has not answered
    // there is no price, `useStorePrice` renders "—", and the button must not
    // open a payment sheet that cannot complete (2.1). ProPaywallModal renders
    // an explicit store-unavailable state instead of a disabled button, which
    // is the same guarantee reached the other way.
    expect(
      /storeReady/.test(source) || /storeUnavailable|paywall\.storeUnavailable/.test(source),
      "no reference to useProPurchase.storeReady (or an explicit " +
        "store-unavailable state). A live Subscribe button beside a '—' " +
        "opens a sheet that fails, which is what App Review taps.",
    ).toBe(true);
  });
});
