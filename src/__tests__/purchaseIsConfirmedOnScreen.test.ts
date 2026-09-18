import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A purchase that succeeded has to say so, and a restore must not claim
 * anything it has not checked.
 *
 * Reported from a device: "I get iOS system messages that the purchase is
 * successful but my app's UI doesn't show any success modals or reflect bought
 * diamonds on my balance." Both halves were real.
 *
 * **Success was silent.** Every success path in `purchase()` ended at
 * `toast.success(...)`, and `src/lib/toast.ts` swallows every toast in the app.
 * The gem path was worse: `useGemPurchase` did `await nativePurchase(id)` and
 * discarded the result, so no caller could react even if it wanted to.
 * `PurchaseSuccessModal` had existed the whole time — wired up for coins and
 * power-ups, never for the things bought with real money.
 *
 * **Restore lied in two directions.** Signed out it announced "Purchases
 * restored! 🎉" without knowing whether the Apple ID owned anything at all,
 * and a sync that merely timed out reported "Restore failed", which reads as
 * "your purchase is gone" rather than "we could not check".
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Comments explain; code decides. */
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");

const hook = strip(read("src/hooks/useInAppPurchases.ts"));
const host = strip(read("src/components/purchases/PurchaseOutcomeHost.tsx"));
const app = strip(read("src/App.tsx"));
const outcome = strip(read("src/utils/restoreOutcome.ts"));

describe("a completed purchase is confirmed on screen", () => {
  it("announces from purchase(), the one choke point every IAP goes through", () => {
    expect(
      hook,
      "the announcement channel is gone. Announcing per-caller is how the gem " +
        "path came to confirm nothing at all",
    ).toMatch(/function announcePurchase/);
    expect(hook, "usePurchaseAnnouncements is no longer exported").toMatch(
      /export function usePurchaseAnnouncements/,
    );
  });

  it("announces on the fully-settled success path", () => {
    const body = hook.slice(
      hook.indexOf("const purchase = useCallback"),
      hook.indexOf("const purchase = useCallback") +
        hook.slice(hook.indexOf("const purchase = useCallback")).search(/\n  \}, \[[^\]]*\]\);/),
    );
    const announcements = body.match(/announcePurchase\(/g) ?? [];
    expect(
      announcements.length,
      "purchase() must announce on BOTH success paths — the settled one and " +
        "the credited-shortly one. The second is the case that looked most " +
        "broken: money taken, balance unmoved, nothing said",
    ).toBeGreaterThanOrEqual(2);
  });

  it("carries the gem count so the confirmation can name what was bought", () => {
    expect(hook, "gemsForProduct is gone — the modal cannot say '+500 Gems'").toMatch(
      /function gemsForProduct/,
    );
  });

  it("renders the confirmation from a host mounted at the app root", () => {
    expect(host, "the host no longer renders PurchaseSuccessModal").toMatch(
      /<PurchaseSuccessModal/,
    );
    expect(
      app,
      "PurchaseOutcomeHost is not mounted in App. The paywall closes itself on " +
        "success and the shop sheet unmounts on navigation, so a confirmation " +
        "owned by either disappears with the screen that bought the thing",
    ).toMatch(/<PurchaseOutcomeHost \/>/);
  });

  it("subscribes with a stable callback", () => {
    expect(
      host,
      "an inline arrow would re-subscribe on every render, because " +
        "usePurchaseAnnouncements keys its effect on the callback",
    ).toMatch(/useCallback/);
  });
});

describe("restore only claims what it has verified", () => {
  it("does not say 'restored' when signed out", () => {
    const body = hook.slice(
      hook.indexOf("const restorePurchases = useCallback"),
      hook.indexOf("const restorePurchases") +
        hook.slice(hook.indexOf("const restorePurchases")).search(/\n  \}, \[[^\]]*\]\);/),
    );
    const signedOut = body.slice(body.indexOf("if (!user)"), body.indexOf('return "signedOut"'));

    expect(
      signedOut,
      "the signed-out branch celebrates a restore again. With no account the " +
        "app cannot know whether this Apple ID owns anything, so it must not " +
        "say that it does",
    ).not.toMatch(/purchasesRestored/);
  });

  it("points a signed-out player at the step they actually owe", () => {
    expect(outcome, "signedOut no longer maps to a sign-in prompt").toMatch(
      /restoreSignInFirst/,
    );
    expect(
      outcome,
      "signedOut must not map to the 'restored' string any more",
    ).not.toMatch(/case "signedOut":\s*return \[[^\]]*purchasesRestored/);
  });

  it("tells 'could not check' apart from 'you own nothing'", () => {
    expect(
      outcome,
      "a failed check still reports as a flat failure. Those are different " +
        "facts: one is an answer, the other is the absence of one",
    ).toMatch(/restoreCouldNotCheck/);
  });

  it("has every new string in all seven locales", () => {
    for (const locale of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${locale}.ts`);
      for (const key of ["restoreSignInFirst", "restoreCouldNotCheck", "gemsLabel", "proLabel"]) {
        expect(src, `${locale} is missing ${key}`).toMatch(new RegExp(`${key}:`));
      }
    }
  });
});
