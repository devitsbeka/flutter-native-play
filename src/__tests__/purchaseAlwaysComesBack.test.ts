import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A charge that has gone through must always release the button, and must say
 * something when it lands.
 *
 * Reproduced on a device against 1.0 (55): the paywall loaded real StoreKit
 * prices, Subscribe was tapped, the App Store confirmed the purchase — and the
 * button sat on "one moment…" for the rest of the session. PRO never unlocked
 * and nothing on screen ever mentioned it.
 *
 * Two independent faults, either of which is enough to produce the 2.1(b)
 * "In-App purchase buttons were unresponsive" finding:
 *
 * 1. **It could hang.** `purchase()` releases the spinner only in its
 *    `finally`, and between the completed charge and that `finally` sat two
 *    unbounded awaits — `syncEntitlements()`, which is a
 *    `supabase.functions.invoke` with no timeout of its own (and which blocks
 *    on an auth-token refresh before it even sends), and `refreshBalance()`.
 *    Either stalling means `setPurchasing(false)` never runs.
 *
 * 2. **It was mute.** Every outcome was reported through `toast`, and
 *    `src/lib/toast.ts` swallows all of them app-wide: successes dropped,
 *    errors to the console. Success, sync-failed and store-no-response were
 *    indistinguishable on screen — all three showed nothing.
 *
 * Neither is a lost purchase: the RevenueCat webhook settles entitlements
 * server-side and Restore re-runs the same sync. What was lost was any
 * evidence that the tap had done anything at all.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Comments explain; code decides. */
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");

const hook = strip(read("src/hooks/useInAppPurchases.ts"));
const paywall = strip(read("src/components/pro/ProPaywallModal.tsx"));

describe("nothing between the charge and the finally can hang", () => {
  it("bounds the entitlement sync", () => {
    const body = hook.slice(
      hook.indexOf("async function syncEntitlements"),
      hook.indexOf("async function syncEntitlements") + 900,
    );

    expect(
      body,
      "verify-receipt is invoked without a timeout again. supabase.functions." +
        "invoke never gives up on its own, and it sits between a completed " +
        "charge and the finally that releases the buy button",
    ).toMatch(/withTimeout\(\s*supabase\.functions\.invoke/);
  });

  it("bounds the balance refresh", () => {
    const body = hook.slice(
      hook.indexOf("const refreshBalance = useCallback"),
      hook.indexOf("}, [user?.id, fetchProfile]);"),
    );

    expect(
      body,
      "refreshBalance awaits fetchProfile unbounded. It is the last await " +
        "before the button is released — a stale balance is recoverable, a " +
        "spinner that never clears is not",
    ).toMatch(/withTimeout\(/);

    expect(
      body,
      "a failed refresh must not propagate: the purchase already succeeded",
    ).toMatch(/catch/);
  });

  it("still releases the button in a finally", () => {
    const purchaseBody = hook.slice(
      hook.indexOf("const purchase = useCallback"),
      hook.indexOf("}, [user, refreshBalance]);"),
    );

    expect(
      purchaseBody,
      "purchase() no longer clears `purchasing` in a finally — every early " +
        "return would leave the button spinning",
    ).toMatch(/finally\s*\{\s*setPurchasing\(false\);/);
  });
});

describe("the paywall says what happened", () => {
  it("keeps the outcome in state rather than only toasting it", () => {
    expect(
      paywall,
      "the paywall dropped its purchase-error state. toast is swallowed " +
        "app-wide, so without this a failed purchase is silent",
    ).toMatch(/setPurchaseError/);
  });

  it("renders the failure under the button", () => {
    expect(paywall, "the failure line is no longer rendered").toMatch(
      /role="status"[\s\S]{0,200}\{purchaseError\}/,
    );
  });

  it("stays quiet when the player cancelled", () => {
    expect(
      paywall,
      "a cancel must not raise an error line — the player did it on purpose " +
        "and already knows",
    ).toMatch(/result\.error === "cancelled"/);
  });

  it("tells a completed-but-unsynced purchase apart from a failed one", () => {
    expect(
      paywall,
      "sync_failed no longer has its own message. Those two mean opposite " +
        "things to the player: one has been charged and needs Restore, the " +
        "other has not been charged at all",
    ).toMatch(/result\.error === "sync_failed"/);
  });

  it("has both messages in every locale", () => {
    for (const locale of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      const src = read(`src/locales/${locale}.ts`);
      expect(src, `${locale} is missing paywall.purchaseSyncFailed`).toMatch(
        /purchaseSyncFailed:/,
      );
      expect(src, `${locale} is missing paywall.purchaseFailed`).toMatch(
        /^\s*purchaseFailed:/m,
      );
    }
  });
});
