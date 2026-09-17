import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * An empty catalogue is never the last word.
 *
 * Version 1.0 (55) came back from App Review with a 2.1(b): "In-App purchase
 * buttons were unresponsive". They were, and the app was working as written.
 *
 * `ensureStore` caches `storeInit` and clears it only from its `.catch`. But
 * `initStore` had paths that *resolved* with `[]` rather than rejecting — the
 * plugin failing to load (including the 15s bound on its dynamic import, which
 * `loadPurchasesPlugin` catches and turns into `null`), and a StoreKit query
 * that came back with nothing. Either one latched a resolved-empty promise
 * into a module-level singleton for the rest of the process. `storeProducts`
 * stayed `[]`, later mounts read it back instantly without re-asking, and
 * because every buy button in the app is disabled on an empty catalogue
 * (`storeUnavailable` on the paywall, `sellable` on gem cards, `storeReady` in
 * useProPurchase) the whole store stayed dead until a force-quit.
 *
 * A reviewer meets that state more reliably than anyone: a fresh install
 * against a sandbox Apple ID is exactly when StoreKit's first product query
 * returns empty — the account is still settling, the ATT dialog has the main
 * thread, the network is cold. First launch is both the likeliest moment to
 * fail and the moment that latched it.
 *
 * Three rules keep it fixed, and each was violated by the shipped build:
 * the empty result must not be cached, the store must come back on its own,
 * and when it finally gives up the screen must offer something to press.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Comments explain; code decides. */
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");

const hook = strip(read("src/hooks/useInAppPurchases.ts"));
const paywall = strip(read("src/components/pro/ProPaywallModal.tsx"));

/** The body of initStore, where the two resolve-empty exits lived. */
const initStoreBody = (() => {
  const start = hook.indexOf("async function initStore()");
  expect(start, "initStore is no longer declared").toBeGreaterThan(-1);
  const end = hook.indexOf("\n}", hook.indexOf("return mapped;", start));
  expect(end, "could not find the end of initStore").toBeGreaterThan(start);
  return hook.slice(start, end);
})();

/** The body of ensureStore, which decides what gets cached. */
const ensureStoreBody = (() => {
  const start = hook.indexOf("function ensureStore()");
  expect(start, "ensureStore is no longer declared").toBeGreaterThan(-1);
  const end = hook.indexOf("\n}", hook.indexOf("return storeInit;", start));
  expect(end, "could not find the end of ensureStore").toBeGreaterThan(start);
  return hook.slice(start, end);
})();

describe("a failed store init is not cached", () => {
  it("throws rather than returning [] when the plugin will not load", () => {
    const missingPlugin = initStoreBody.slice(
      initStoreBody.indexOf("if (!plugin)"),
      initStoreBody.indexOf("const platform"),
    );

    expect(
      missingPlugin,
      "the no-plugin path resolves with [] again. ensureStore only clears its " +
        "cache from .catch, so a resolved empty array disables purchases for " +
        "the entire process — the 2.1(b) on build 55",
    ).not.toMatch(/return \[\]/);

    expect(
      missingPlugin,
      "the no-plugin path must throw so ensureStore's .catch clears storeInit",
    ).toMatch(/throw new StoreUnavailableError/);
  });

  it("throws when StoreKit answers with no products at all", () => {
    const zeroProducts = initStoreBody.slice(initStoreBody.lastIndexOf("mapped.length === 0"));

    expect(
      zeroProducts,
      "zero products is reported and then returned as a normal result. On a " +
        "fresh install that is a timing answer, not a final one, and caching " +
        "it is what left every buy button inert",
    ).toMatch(/throw new StoreUnavailableError/);
  });

  it("keeps a distinguishable error type for the retryable cases", () => {
    expect(
      hook,
      "StoreUnavailableError is gone — the retryable failures can no longer be " +
        "told apart from a genuine crash",
    ).toMatch(/class StoreUnavailableError extends Error/);
  });
});

describe("the store comes back on its own", () => {
  it("clears the cached promise when init fails", () => {
    expect(
      ensureStoreBody,
      "ensureStore no longer clears storeInit on failure, so nothing can retry",
    ).toMatch(/storeInit = null/);
  });

  it("schedules another attempt rather than waiting for a remount", () => {
    expect(
      ensureStoreBody,
      "a failed init only retries if something remounts. A reviewer sits on the " +
        "paywall and taps — nothing unmounts, so nothing ever asks again",
    ).toMatch(/setTimeout/);

    expect(
      hook,
      "the backoff schedule is gone",
    ).toMatch(/STORE_RETRY_DELAYS_MS/);
  });

  it("bounds the retries so a dead store is not retried forever", () => {
    const delays = hook.match(/const STORE_RETRY_DELAYS_MS = \[([^\]]*)\]/);
    expect(delays, "STORE_RETRY_DELAYS_MS is no longer a literal list").toBeTruthy();
    const count = delays![1].split(",").filter((s) => s.trim()).length;
    expect(count, "retry budget must be small and finite").toBeGreaterThan(0);
    expect(count, "retrying this many times is a battery drain, not a fix").toBeLessThanOrEqual(5);
  });

  it("asks again when the app returns from the background", () => {
    expect(
      hook,
      "the resume listener is gone. Returning to the app is where a player " +
        "lands after leaving to sign into the App Store or fix their network — " +
        "the one moment a dead store is most likely to have become a live one",
    ).toMatch(/appStateChange/);
  });

  it("only re-queries when the catalogue is actually empty", () => {
    expect(
      hook,
      "the resume handler must bail out when products are already loaded, or " +
        "every foreground re-queries a perfectly healthy store",
    ).toMatch(/storeProducts\.length > 0\)\s*return/);
  });
});

describe("a store that has given up offers something to press", () => {
  it("exposes the failure and a retry from the hook", () => {
    expect(hook, "the hook no longer reports an unavailable store").toMatch(/unavailable,/);
    expect(hook, "the hook no longer exposes a retry").toMatch(/retry,/);
    expect(hook, "retryStore is no longer exported for the surfaces to call").toMatch(
      /export function retryStore/,
    );
  });

  it("does not flash an error while a retry is still pending", () => {
    expect(
      hook,
      "announceFailure is gone — without it the screen cannot tell 'still " +
        "trying' from 'gave up', and will show an error between attempts",
    ).toMatch(/function announceFailure/);
  });

  it("gives the paywall a live button when the store is unavailable", () => {
    const panel = paywall.slice(
      paywall.indexOf("{storeUnavailable ? ("),
      paywall.indexOf("<div className=\"mt-5 space-y-3\">"),
    );

    expect(
      panel,
      "the store-unavailable panel has no retry control. Subscribe is disabled " +
        "on an empty catalogue, so without this the only button on the screen " +
        "does nothing when tapped and says nothing about why — which is exactly " +
        "what App Review wrote up as 'unresponsive'",
    ).toMatch(/onClick=\{\(\) => void retry\(\)\}/);

    expect(
      panel,
      "the retry button must not be disabled — an inert control is the bug",
    ).not.toMatch(/disabled=/);
  });

  it("labels the retry from the locale catalogue", () => {
    expect(paywall, "the retry button lost its translated label").toMatch(
      /t\("paywall\.storeRetry"\)/,
    );

    for (const locale of ["en", "ka", "de", "es", "fr", "it", "pt"]) {
      expect(
        read(`src/locales/${locale}.ts`),
        `${locale} is missing paywall.storeRetry, so the button renders its key`,
      ).toMatch(/storeRetry:/);
    }
  });
});
