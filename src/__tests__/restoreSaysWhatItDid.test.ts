import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Restore has to be findable, and it has to answer.
 *
 * Version 1.0 (55) came back from App Review with a 3.1.1: "does not include a
 * Restore Purchases feature". It did. Twice — a row in Settings and a link on
 * the paywall — and both were unusable for the same two reasons:
 *
 * 1. **It said nothing.** `restorePurchases` reported through `toast`, and
 *    `src/lib/toast.ts` swallows every toast in the app: successes are dropped
 *    outright, errors go to the console. Restored, nothing to restore, and
 *    failed were therefore all one thing on screen — nothing.
 * 2. **It moved the wrong control.** Restore raised the shared `purchasing`
 *    flag, which is what disables every buy button in the app. So the visible
 *    result of tapping Restore was the Subscribe button above it greying out
 *    and changing its label to "working".
 *
 * On top of that the paywall drew it last: 11px grey, on a line with Terms and
 * Privacy, under a four-line renewal paragraph. A reviewer who does not find it
 * writes that it is not there, and they are not wrong to.
 *
 * These are the rules that keep it fixed. They are cheap to break by accident —
 * every one of them was true at some point and then wasn't.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Comments explain; code decides. */
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");

const hook = strip(read("src/hooks/useInAppPurchases.ts"));
const paywall = read("src/components/pro/ProPaywallModal.tsx");
const settingsRow = strip(read("src/components/settings/RestorePurchasesRow.tsx"));
const link = strip(read("src/components/purchases/RestorePurchasesLink.tsx"));
const settingsPage = read("src/pages/Settings.tsx");
const shop = read("src/components/shop/ShopStandardLayout.tsx");

/** The body of restorePurchases, which is where both bugs lived. */
const restoreBody = (() => {
  const start = hook.indexOf("const restorePurchases = useCallback");
  expect(start, "restorePurchases is no longer declared as a useCallback").toBeGreaterThan(-1);
  const end = hook.indexOf("}, [user, refreshBalance]);", start);
  expect(end, "could not find the end of restorePurchases").toBeGreaterThan(start);
  return hook.slice(start, end);
})();

describe("restore reports its result to the caller", () => {
  it("returns an outcome rather than a boolean", () => {
    expect(
      restoreBody,
      "restorePurchases went back to a boolean — a bare true/false cannot tell " +
        "'restored' from 'nothing to restore', so no screen can say which happened",
    ).toMatch(/Promise<RestoreOutcome>/);
  });

  it("names every way it can end", () => {
    for (const outcome of ["restored", "signedOut", "none", "failed", "notMobile"]) {
      expect(
        restoreBody,
        `restorePurchases never returns "${outcome}" — that path has gone silent again`,
      ).toContain(`return "${outcome}"`);
    }
  });

  it("does not drive the buy buttons' busy flag", () => {
    expect(
      restoreBody,
      "restore raises `purchasing` again, which disables every buy button in " +
        "the app — including the Subscribe button directly above it on the paywall",
    ).not.toMatch(/setPurchasing\(/);
    expect(restoreBody, "restore has no busy flag of its own").toMatch(/setRestoring\(true\)/);
  });
});

describe("every surface that offers restore shows the answer", () => {
  for (const [name, source] of [
    ["RestorePurchasesRow", settingsRow],
    ["RestorePurchasesLink", link],
  ] as const) {
    it(`${name} renders the outcome`, () => {
      // Either by rendering the keys itself, or by handing the outcome to
      // RestoreResultModal, which does. The surfaces moved to the shared modal
      // once the inline version turned out to be a 12px grey line under the
      // link — displayed, technically, and missed by everyone who tapped it.
      // What this guards is unchanged: the answer is drawn, not toasted, and
      // toasts are suppressed app-wide.
      expect(
        source,
        `${name} neither renders restoreOutcomeKeys nor passes its outcome to ` +
          "RestoreResultModal — the result is being reported through a toast " +
          "again, and toasts are suppressed app-wide",
      ).toMatch(/restoreOutcomeKeys\(|<RestoreResultModal[\s\S]*?outcome=\{outcome\}/);
    });

    it(`${name} shows its own progress, not the store's`, () => {
      expect(
        source,
        `${name} reads \`purchasing\` — that flag belongs to the buy buttons; ` +
          "restore has `restoring`",
      ).not.toMatch(/\bpurchasing\b/);
      expect(source, `${name} never shows that a restore is running`).toMatch(/\brestoring\b/);
    });
  }

  it("the Settings row is not hidden off native", () => {
    expect(
      settingsRow,
      "the Settings restore row returns null again when Capacitor says the " +
        "platform is not native — an absence with no symptom, and the exact " +
        "shape of 'I don't see it in Settings'",
    ).not.toMatch(/isNativePlatform\(\)\s*\)\s*return null/);
  });
});

describe("restore is somewhere a player and a reviewer will look", () => {
  it("is in Settings, above the collapsible rows", () => {
    const restore = settingsPage.indexOf("<RestorePurchasesRow");
    const nameRow = settingsPage.indexOf("Name Change - Collapsible");
    expect(restore, "Settings no longer renders RestorePurchasesRow").toBeGreaterThan(-1);
    expect(
      restore,
      "the restore row has slid back down the Settings page; it belongs above " +
        "the collapsible name and password rows, where it is on screen without scrolling",
    ).toBeLessThan(nameRow);
  });

  it("is at the foot of the shop", () => {
    expect(
      shop,
      "the shop page has no restore link — it is where a player who already " +
        "paid arrives, and where App Review tests purchases",
    ).toMatch(/<RestorePurchasesLink/);
  });

  it("is on the paywall, under the buy button and above the small print", () => {
    const cta = paywall.indexOf("<ChunkyButton");
    const restore = paywall.search(/<RestorePurchasesLink[\s/>]/);
    const terms = paywall.indexOf("<SubscriptionTerms");
    const links = paywall.indexOf('t("paywall.terms")');

    expect(restore, "the paywall no longer offers restore").toBeGreaterThan(-1);
    expect(
      restore,
      "restore is drawn above the buy button; it is the second thing on the row, not the first",
    ).toBeGreaterThan(cta);
    expect(
      restore,
      "restore has sunk below the renewal disclosure again — that is where the " +
        "reviewer failed to find it",
    ).toBeLessThan(terms);
    expect(
      links,
      "the Terms and Privacy links are no longer last on the paywall",
    ).toBeGreaterThan(terms);
  });
});
