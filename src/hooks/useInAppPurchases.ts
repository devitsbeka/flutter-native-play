import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/lib/toast";
import { t as tStandalone } from "@/contexts/LanguageContext";
import { introFreeDays } from "@/utils/introOffer";

// Product IDs configured in App Store Connect and mirrored in RevenueCat.
// Must stay in sync with PRODUCTS in supabase/functions/_shared/iap.ts, which
// is where each one is turned into an entitlement.
//
// Both subscriptions are **monthly**. PRO and Friends PRO differ by features
// (1 vs 5 friend invites) and not by billing period — see PRO_TIERS in
// components/profile/ProPlansSection.tsx, where both render a "/month" label.
// They used to be named `vip.monthly`/`vip.annual`, copied from an old
// shop_items migration that really did sell a monthly and an annual VIP. That
// naming would have had whoever created the App Store product pick a 1-year
// duration for the $7.99 tier while the app said "/month" — 12x under-charging
// and a guideline 2.3.1 mismatch on the same screen. Renamed before either was
// created, because an App Store product id can never be reused once it exists.
export const IAP_PRODUCTS = {
  PRO_MONTHLY: "io.mytrivia.pro.monthly",
  // The paywall's other two billing periods for the same PRO tier. They are
  // listed here so the StoreKit query asks for them and the paywall can offer
  // them the day they exist; until they are created in App Store Connect the
  // store simply does not return them, and src/config/proPlans.ts drops the
  // rows rather than showing a plan that cannot be bought.
  PRO_ANNUAL: "io.mytrivia.pro.annual",
  PRO_WEEKLY: "io.mytrivia.pro.weekly",
  PRO_PLUS_MONTHLY: "io.mytrivia.proplus.monthly",
  // `io.mytrivia.adfree` is deliberately absent. It was a non-consumable
  // whose only entry point was AdFreeModal, which Index rendered and never
  // opened — `setIsAdFreeModalOpen(true)` appeared nowhere in the app. A
  // product App Review cannot reach is a 2.1 rejection ("we were unable to
  // locate the in-app purchase") the moment it is attached to a submission,
  // and PRO already includes ad removal.
  //
  // The server still recognises the id (`PRODUCTS.AD_FREE` in
  // supabase/functions/_shared/iap.ts) so any existing entitlement keeps
  // resolving on restore. Selling it again means giving it a real entry
  // point first, not just putting the id back here.
} as const;

// Gem consumables are defined alongside the packs they sell, in
// src/config/gemPacks.ts, so the shop and the store SKUs cannot drift apart.
// Imported as well as re-exported: `export { X } from` is a pure re-export and
// does not bind X in this module's scope.
import { GEM_PACK_PRODUCTS } from "@/config/gemPacks";
export { GEM_PACK_PRODUCTS } from "@/config/gemPacks";

// Every id the app can sell, for the direct StoreKit query below. Offerings
// are the normal route; this is the list to fall back to when they come back
// empty, which is a RevenueCat dashboard state and not something the user of
// a shipped build can be asked to wait out.
const ALL_PRODUCT_IDS: string[] = [
  ...Object.values(IAP_PRODUCTS),
  ...Object.values(GEM_PACK_PRODUCTS),
];

// Diagnostics that survive a production build.
//
// vite.config.ts lists console.log/debug/info as `pure` for production, so
// esbuild deletes those calls outright. Breadcrumbs written with console.log
// therefore exist in the source, exist in the repo, and are absent from the
// exact build anyone would be debugging — which is how three device captures
// came back silent and were read as "this code never ran".
//
// The purchase path is the one place where "it did nothing and said nothing"
// is the whole bug report, so its trace is written at warn. One line per
// launch, not per render.
const iapLog = (...args: unknown[]) => console.warn("[iap]", ...args);

// A StoreKit query that never comes back is a spinner that never stops.
//
// getOfferings and getProducts both reach StoreKit, and StoreKit does not
// promise to answer: with no App Store account on the device, no network, or
// a storefront it cannot resolve, the request can sit open indefinitely. The
// plugin surfaces that as a promise that neither resolves nor rejects, so
// every `finally` downstream — including the one that clears `purchasing` —
// simply never runs.
//
// 15s is past any healthy fetch and short enough that a stuck one reads as a
// failure rather than as the app being broken. Deliberately not applied to
// purchasePackage/purchaseStoreProduct: those are open for as long as the
// user takes with the payment sheet, and Face ID plus a password prompt is
// legitimately longer than this.
const STORE_QUERY_TIMEOUT_MS = 15_000;

// `work` is typed loosely on purpose. Every caller passes a plugin call, and
// the plugin is `any` — the RevenueCat types are only present in a native
// build. Declaring the parameter as Promise<T> makes TypeScript try to read T
// out of `any` and settle on `unknown`, so the awaited offerings lost every
// property the callers then read (`.current`, `.all`, `.products`) and the
// build failed on ten of them. Taking PromiseLike<any> and returning T keeps
// the timeout without narrowing what the plugin hands back.
function withTimeout<T = any>(work: PromiseLike<T>, label: string): Promise<T> {
  // The timer is cleared once the race settles. Without that, a call that
  // answered in 100ms still left a timer armed for the remaining 14.9s, which
  // then rejected into a promise Promise.race had already discarded — an
  // unhandled rejection per bounded call, every one of them a lie about a
  // call that had in fact succeeded.
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    work,
    new Promise<T>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${label} did not answer within ${STORE_QUERY_TIMEOUT_MS}ms`)),
        STORE_QUERY_TIMEOUT_MS,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  /**
   * Free days the **store** will actually grant before the first charge, from
   * the introductory offer configured on the product in App Store Connect —
   * or undefined when there is no free offer on it.
   *
   * This is read rather than declared on purpose. The paywall used to promise
   * "Try 1 day free" from a `trialDays` constant in the bundle, which is a
   * claim about App Store Connect that nothing in the app could check. Get
   * that wrong and the app advertises an offer StoreKit will not honour, on
   * the screen App Review reads most carefully (2.3.1, 3.1.2).
   */
  introFreeDays?: number;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Dynamic import for RevenueCat Purchases
let Purchases: any = null;
let LOG_LEVEL: any = null;

/**
 * A box around the plugin proxy. Never hand the proxy back directly.
 *
 * `registerPlugin` returns a Proxy whose `get` trap manufactures a method for
 * any property name it is not specifically told about — it special-cases
 * `$$typeof`, `toJSON`, `addListener` and `removeListener`, and nothing else.
 * `then` therefore reads as a function, which makes the proxy a **thenable**.
 *
 * Resolving a promise with a thenable adopts it: JavaScript calls
 * `value.then(resolve, reject)` and waits to be called back. What it reaches
 * here is Capacitor's generic method wrapper, which dispatches a `Purchases.then()`
 * call that does not exist and never invokes either callback. The
 * CapacitorException it raises lands in an internal promise nobody observes.
 *
 * So `return Purchases` from an `async` function does not return. The caller's
 * `await` never settles, never rejects, and logs nothing — the whole store
 * init sits pending behind one `return` statement. Because `storeInit` is a
 * module-level singleton, every later visit awaits the same stuck promise,
 * which is why the buy button spun forever and the log stayed flat.
 *
 * A plain object is not thenable, so the box is returned as-is.
 */
interface PluginHolder {
  plugin: any;
}

async function loadPurchasesPlugin(): Promise<PluginHolder | null> {
  if (Purchases) return { plugin: Purchases };

  if (Capacitor.isNativePlatform()) {
    try {
      // Announced before and after, and bounded.
      //
      // This line was the blind spot. A dynamic import is a chunk fetch, and
      // a fetch that stalls rather than fails leaves the promise pending
      // forever: no plugin call reaches the native bridge, no `catch` runs so
      // nothing is logged, and every caller awaiting this — including
      // purchase() — waits with it. From the device that is a buy button that
      // spins with an empty console, and from the log it is indistinguishable
      // from the hook never having mounted at all.
      iapLog("importing @revenuecat/purchases-capacitor…");
      const module = await withTimeout(
        import("@revenuecat/purchases-capacitor"),
        "import(@revenuecat/purchases-capacitor)",
      );
      Purchases = module.Purchases;
      LOG_LEVEL = module.LOG_LEVEL;

      // Report what actually came back, not merely that something did.
      //
      // This line used to announce "plugin module loaded" unconditionally,
      // one statement after the assignment above and without looking at it.
      // So it attested to the import resolving and nothing else — and when
      // `module.Purchases` was undefined, the caller's `if (!plugin) return`
      // took a branch with no logging on it at all. The trace stopped dead
      // between two lines with nothing between them, which cost a full
      // capture cycle to narrow.
      if (!Purchases) {
        iapLog(
          "module resolved but Purchases is",
          typeof Purchases,
          "— exports:",
          Object.keys(module ?? {}).join(", ") || "(none)",
        );
        return null;
      }

      iapLog("plugin module loaded, Purchases is", typeof Purchases);

      // Boxed, because returning the proxy itself from an `async` function
      // hangs forever. See the note on PluginHolder.
      return { plugin: Purchases };
    } catch (e) {
      // Warn, not error. Across every capture tonight [warn] reached the
      // device console and [error] was never once observed — whether because
      // it is not forwarded or because it was never called could not be told
      // apart, precisely because the only evidence would itself have been an
      // error line. Both silent exits from this path used to log at error,
      // so both were invisible. Nothing here is worth losing to that.
      iapLog("Failed to load RevenueCat Purchases plugin:", String(e));
      return null;
    }
  }
  return null;
}

// The store is configured once per process, not once per component.
//
// `useInAppPurchases` is called by useStorePrice, which is called by every
// ShopItemCard as well as the sidebar and the carousel — so opening the shop
// mounted six or more copies of this hook, each running its own effect and
// each calling configure() and getOfferings() concurrently. RevenueCat
// documents configure() as a once-per-launch call; racing it against its own
// in-flight offerings fetch is undefined, and the observed shape of that was
// a promise that never settled and a buy button that spun forever.
//
// One shared promise, one shared result, and every hook instance reads from
// it. The promise is cleared on failure so a later mount can retry rather
// than inheriting a permanent error.
let storeInit: Promise<IAPProduct[]> | null = null;
let storeProducts: IAPProduct[] = [];
const storeSubscribers = new Set<(p: IAPProduct[]) => void>();

function toIAPProduct(product: any): IAPProduct {
  return {
    productId: product.identifier,
    title: product.title || product.identifier,
    description: product.description || "",
    price: product.priceString || "",
    priceAmountMicros: Math.round((product.price || 0) * 1000000),
    priceCurrencyCode: product.currencyCode || "USD",
    introFreeDays: introFreeDays(product.introPrice),
  };
}

async function initStore(): Promise<IAPProduct[]> {
  // First line of the whole path, so a silent run can be told apart from a
  // run that never started. Absent this, "the hook never mounted" and "the
  // hook mounted and hung on the very next line" produce identical logs.
  iapLog(`initStore on ${Capacitor.getPlatform()}`);
  if (!Capacitor.isNativePlatform()) return [];

  const plugin = (await loadPurchasesPlugin())?.plugin;
  if (!plugin) {
    // Was a bare `return []`. It is one of only two ways out of initStore
    // before the store is touched, and it said nothing on the way.
    iapLog("no plugin available — purchases disabled for this launch");
    return [];
  }

  // Get platform-specific API key.
  //
  // No placeholder fallback. It used to default to "appl_CONFIGURE_IN_ENV",
  // which configure() accepts happily — then getOfferings() returns nothing
  // and the paywall renders with no products at all. The only symptom was a
  // console warning, so the failure looked like "the store is empty today"
  // rather than "nobody set the key".
  const platform = Capacitor.getPlatform();
  const apiKey =
    platform === "ios"
      ? import.meta.env.VITE_REVENUECAT_IOS_API_KEY
      : import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY;

  if (!apiKey) {
    iapLog(
      `No RevenueCat key for ${platform}. Purchases are disabled. ` +
        `Set VITE_REVENUECAT_${platform.toUpperCase()}_API_KEY.`,
    );
    return [];
  }

  // setLogLevel and configure are bounded too.
  //
  // They were not, and that is where it hung. The timeouts added for the
  // StoreKit queries all sat downstream of these two lines, so they never got
  // the chance to fire: initStore stopped here, `storeInit` — a module-level
  // singleton every caller shares — never settled, and purchase() awaited it
  // forever. The `finally` that clears `purchasing` never ran, which is the
  // spinner, and because the call never reached the bridge there was no
  // native log either. Silent, unbounded, and identical for every product,
  // which is why gems and PRO failed the same way.
  //
  // Each is announced separately. "configure hung" and "the very first bridge
  // call hung" are different faults — the second means the native plugin is
  // not answering at all — and they were indistinguishable from one line.
  iapLog("setLogLevel…");
  await withTimeout(
    plugin.setLogLevel({
      level: import.meta.env.DEV ? (LOG_LEVEL?.DEBUG ?? "DEBUG") : (LOG_LEVEL?.ERROR ?? "ERROR"),
    }),
    "setLogLevel",
  );

  iapLog("configure…");
  await withTimeout(plugin.configure({ apiKey }), "configure");

  iapLog("getOfferings…");
  const offerings = await withTimeout(plugin.getOfferings(), "getOfferings");

  const mapped: IAPProduct[] = [];
  const add = (product: any) => {
    if (product && !mapped.find((p) => p.productId === product.identifier)) {
      mapped.push(toIAPProduct(product));
    }
  };

  for (const pkg of offerings?.current?.availablePackages ?? []) add(pkg.storeProduct);
  for (const key of Object.keys(offerings?.all ?? {})) {
    for (const pkg of offerings.all[key].availablePackages ?? []) add(pkg.storeProduct);
  }

  // Offerings came back with nothing in them. Ask StoreKit directly for the
  // ids we know about, rather than rendering a shop with no prices.
  //
  // An empty offering is a dashboard state — a product not added to a
  // package, a package pointing at the wrong id, an offering that isn't
  // current — and none of it is visible or fixable from the device. The
  // consequence without this was not a blank price but a *wrong* one:
  // useStorePrice falls back to the figure compiled into the bundle.
  if (mapped.length === 0) {
    console.warn(
      "[iap] No offerings returned any products. Querying StoreKit directly " +
        "for known ids. Check the default offering in RevenueCat.",
    );
    try {
      const direct = await withTimeout(
        plugin.getProducts({ productIdentifiers: ALL_PRODUCT_IDS }),
        "getProducts",
      );
      for (const product of direct?.products ?? []) add(product);
    } catch (e) {
      console.error("[iap] Direct getProducts failed:", e);
    }
  }

  iapLog("RevenueCat initialized, products:", mapped);

  // Nothing from offerings *and* nothing from StoreKit means the store itself
  // is returning no products for this build. Say so once, plainly, because
  // every downstream symptom (fallback prices, dead buy buttons) looks like an
  // app bug rather than a store one.
  if (mapped.length === 0) {
    console.error(
      `[iap] StoreKit returned zero products for ${ALL_PRODUCT_IDS.length} ` +
        `known ids on ${platform}: ${ALL_PRODUCT_IDS.join(", ")}. Purchases ` +
        "cannot work in this build. Check: Paid Applications agreement active, " +
        "product ids exist and are at least 'Ready to Submit', bundle id " +
        "matches, and that newly created products have finished propagating.",
    );
  }

  return mapped;
}

// Who RevenueCat currently believes it is talking to.
//
// A purchase is attributed to whatever app user id is configured at the
// moment it completes. If logIn has not landed yet, that is RevenueCat's own
// anonymous id ($RCAnonymousID:…), and the purchase is recorded against it —
// while verify-receipt asks RevenueCat about the *Supabase* user id and is
// correctly told there is nothing there. The store charges, the sheet says
// "You're all set", the sync returns success with gemsCredited: 0, and the
// balance never moves.
//
// This used to be fire-and-forget from an effect that nothing waited on, so
// whether a purchase was attributed correctly came down to whether the user
// tapped Buy before or after a network round trip finished.
let identifiedAs: string | null = null;
let identifyInFlight: Promise<void> | null = null;

function ensureIdentified(userId: string): Promise<void> {
  if (identifiedAs === userId) return Promise.resolve();
  if (identifyInFlight) return identifyInFlight;

  identifyInFlight = (async () => {
    await ensureStore();
    const plugin = (await loadPurchasesPlugin())?.plugin;
    if (!plugin) return;
    // RevenueCat transfers purchases made while anonymous onto the id being
    // logged in, so this also repairs a purchase that raced ahead of it.
    await withTimeout(plugin.logIn({ appUserID: userId }), "logIn");
    identifiedAs = userId;
    iapLog("identified to RevenueCat as", userId);
  })()
    .catch((e) => {
      iapLog("logIn failed — purchases would be attributed anonymously:", String(e));
    })
    .finally(() => {
      identifyInFlight = null;
    });

  return identifyInFlight;
}

function ensureStore(): Promise<IAPProduct[]> {
  if (!storeInit) {
    storeInit = initStore()
      .then((p) => {
        storeProducts = p;
        storeSubscribers.forEach((fn) => fn(p));
        return p;
      })
      .catch((e) => {
        console.error("[iap] Store initialization failed:", e);
        // Cleared so a later mount retries. A timed-out first fetch on a bad
        // connection should not disable the shop for the rest of the session.
        storeInit = null;
        return [];
      });
  }
  return storeInit;
}

export function useInAppPurchases() {
  const { user, fetchProfile } = useAuth();
  const [products, setProducts] = useState<IAPProduct[]>(storeProducts);
  const [loading, setLoading] = useState(storeProducts.length === 0);
  const [purchasing, setPurchasing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(storeProducts.length > 0);

  useEffect(() => {
    let alive = true;
    storeSubscribers.add(setProducts);

    ensureStore().then((p) => {
      if (!alive) return;
      setProducts(p);
      setIsInitialized(p.length > 0);
      setLoading(false);
    });

    return () => {
      alive = false;
      storeSubscribers.delete(setProducts);
    };
  }, []);

  // Identify the user to RevenueCat once the store is up. Separate from
  // initialization because sign-in happens on its own schedule, and a logIn
  // failure must not take the product catalog down with it.
  useEffect(() => {
    if (!user?.id || !Capacitor.isNativePlatform()) return;
    void ensureIdentified(user.id);
  }, [user?.id]);


  // Re-read the profile so the balance on screen matches the database.
  const refreshBalance = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  // Purchase a product
  const purchase = useCallback(async (productId: string): Promise<PurchaseResult> => {
    if (!user) {
      toast.error(tStandalone("iap.pleaseSignIn"));
      return { success: false, error: "Not authenticated" };
    }

    if (!Capacitor.isNativePlatform()) {
      toast.error(tStandalone("iap.purchaseOnlyMobile"));
      return { success: false, error: "Not on native platform" };
    }

    setPurchasing(true);

    try {
      const plugin = (await loadPurchasesPlugin())?.plugin;
      if (!plugin) {
        throw new Error("Purchase plugin not available");
      }

      // Identify before charging, never after. The alternative is a purchase
      // attributed to an anonymous id that this account cannot be credited
      // for. Awaited rather than assumed: the effect that starts this runs on
      // mount, and a fast tap beats a network round trip.
      await ensureIdentified(user.id);

      // Get offerings to find the package for this product
      const offerings = await withTimeout(plugin.getOfferings(), "getOfferings");
      let targetPackage = null;

      // Search through all offerings for the product
      if (offerings?.all) {
        for (const offeringKey of Object.keys(offerings.all)) {
          const offering = offerings.all[offeringKey];
          for (const pkg of offering.availablePackages || []) {
            if (pkg.storeProduct?.identifier === productId) {
              targetPackage = pkg;
              break;
            }
          }
          if (targetPackage) break;
        }
      }

      // Also check current offering
      if (!targetPackage && offerings?.current?.availablePackages) {
        for (const pkg of offerings.current.availablePackages) {
          if (pkg.storeProduct?.identifier === productId) {
            targetPackage = pkg;
            break;
          }
        }
      }

      let customerInfo;
      
      if (targetPackage) {
        // Purchase using package (preferred method)
        const result = await plugin.purchasePackage({ aPackage: targetPackage });
        customerInfo = result.customerInfo;
      } else {
        // No package carries this product, which always means the RevenueCat
        // offering is misconfigured — the product is missing from it, or a
        // package points at the wrong one. That has happened: the gems_5000
        // package was once wired to io.mytrivia.gems.1500, leaving the 5000
        // pack in no package at all.
        //
        // The fallback still runs, because failing a purchase the user asked
        // for is worse than attempting it. But it is announced first: it is
        // reached only from a broken configuration, and the same fault also
        // drops the product out of `products`, so the paywall quietly shows
        // the price compiled into the bundle instead of the store's. Silent,
        // and wrong on every storefront that is not the US.
        console.error(
          `[iap] ${productId} is in no RevenueCat offering. Add it as a ` +
            `package in the default offering — until then its paywall price ` +
            `is the compiled fallback, not the store's.`,
        );

        // Fetch the real StoreProduct before buying it.
        //
        // This used to hand purchaseStoreProduct a hand-made
        // `{ identifier: productId }`. The plugin's signature takes a full
        // PurchasesStoreProduct — priceString, currencyCode, the StoreKit
        // handle, all of it — so the native side received an object with
        // every field but one missing and never came back. On the device that
        // was a buy button that spun forever or took the app down with it,
        // with nothing logged, because the promise neither resolved nor
        // rejected.
        const found = await withTimeout(
          plugin.getProducts({ productIdentifiers: [productId] }),
          "getProducts",
        );
        const storeProduct = found?.products?.find(
          (p: any) => p.identifier === productId,
        );

        if (!storeProduct) {
          // The store does not know this id. Nothing can be purchased, and
          // there is no object to pass on — stop here rather than call into
          // StoreKit with something invented.
          console.error(
            `[iap] StoreKit has no product ${productId}. It is missing from ` +
              `App Store Connect, not yet 'Ready to Submit', or the Paid ` +
              `Applications agreement is not active.`,
          );
          toast.error(tStandalone("extra.iapItemUnavailable"));
          return { success: false, error: "product_not_found" };
        }

        const result = await plugin.purchaseStoreProduct({ product: storeProduct });
        customerInfo = result.customerInfo;
      }

      if (customerInfo) {
        // The purchase itself is done. What the account is now entitled to is
        // decided server-side: we ask the backend to re-read this user from
        // RevenueCat and write the result. Nothing about the transaction is
        // sent from here, because nothing sent from here could be trusted.
        //
        // Retried for gem packs, because RevenueCat's REST API is eventually
        // consistent. The SDK hands back customerInfo the moment the sheet
        // closes, but verify-receipt reads the subscriber record over HTTP,
        // and for a second or two after a purchase that record does not yet
        // list the transaction. The sync then succeeds truthfully with
        // gemsCredited: 0 — a charged card, a success toast, and a balance
        // that does not move. Restoring a minute later worked, which is the
        // same call winning the same race.
        //
        // Only consumables are retried: a subscription legitimately credits
        // no gems, so waiting on that would be waiting for something that is
        // never coming.
        const expectsGems = Object.values(GEM_PACK_PRODUCTS).includes(productId);
        const synced = await syncEntitlements();

        if (expectsGems && synced.success && synced.gemsCredited === 0) {
          // Not credited on the first ask. Stop waiting in front of the user
          // and keep waiting behind them.
          //
          // A blocking retry loop was tried and was the wrong shape: 1.5s +
          // 3s + 5s held the spinner for nine seconds and then reported
          // failure, while sandbox propagation from StoreKit to RevenueCat
          // regularly takes longer than that. Two identical purchases a
          // minute apart landed on opposite sides of that cutoff — one
          // credited, one declared failed — and both were fine.
          //
          // The money has moved and the webhook will credit it regardless, so
          // there is nothing for the player to do and no reason to make them
          // watch. creditConsumables claims each transaction in iap_events
          // before crediting, so the poll and the webhook cannot both apply
          // the same purchase.
          iapLog("not credited yet — polling in the background");
          void pollForCredit(refreshBalance);
          await refreshBalance();
          toast.success(tStandalone("extra.iapGemsShortly"));
          return { success: true };
        }

        if (!synced.success) {
          // The money moved even though the sync didn't. Say so honestly
          // rather than reporting a failed purchase the user was charged for —
          // the webhook will settle it, and restore covers the rest.
          toast.error(tStandalone("extra.iapActivationFailed"));
          return { success: false, error: "sync_failed" };
        }

        // Pull the new balance before saying so. The gems are credited to
        // `profiles` by the server, and the header reads that row out of the
        // auth context — which is loaded once on launch and never refetched.
        // Without this the credit is real, the toast is true, and the number
        // on screen is yesterday's until the app is restarted. That is
        // indistinguishable from the purchase having been lost, and it is
        // what "I had those gems on launch" was.
        await refreshBalance();

        toast.success(tStandalone("iap.purchaseComplete"));
        return { success: true };
      }

      // No customerInfo and no throw. This is what an unmatched product does:
      // the fallback above hands purchaseStoreProduct a hand-made
      // `{ identifier }` rather than a real StoreProduct, and it can resolve
      // without buying anything. Silent until now — the button simply did
      // nothing, which is indistinguishable from a dead tap handler.
      console.error(`[iap] ${productId} returned no customerInfo — nothing was purchased`);
      toast.error(tStandalone("extra.iapStoreNoResponse"));
      return { success: false, error: "no_customer_info" };
    } catch (error: any) {
      console.error("Purchase error:", error);
      
      // Handle user cancellation gracefully
      if (
        error.message?.includes("cancelled") || 
        error.message?.includes("canceled") ||
        error.code === "1" ||
        error.code === "PURCHASE_CANCELLED" ||
        error.userCancelled
      ) {
        return { success: false, error: "cancelled" };
      }
      
      toast.error(tStandalone("iap.purchaseFailed"));
      return { success: false, error: error.message };
    } finally {
      setPurchasing(false);
    }
  }, [user, refreshBalance]);

  // Restore previous purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error(tStandalone("iap.pleaseSignIn"));
      return false;
    }

    if (!Capacitor.isNativePlatform()) {
      toast.info(tStandalone("extra.iapRestoreOnlyMobile"));
      return false;
    }

    setPurchasing(true);

    try {
      const plugin = (await loadPurchasesPlugin())?.plugin;
      if (!plugin) {
        throw new Error("Purchase plugin not available");
      }

      // Hand the restore to StoreKit, then let the server decide what it
      // means. One sync replaces the old per-entitlement loop, which walked
      // the client's own view of the purchases and posted each one back as if
      // it were proof.
      await plugin.restorePurchases();

      const synced = await syncEntitlements();
      if (!synced.success) {
        toast.error(tStandalone("iap.restoreFailed"));
        return false;
      }

      if (synced.tier || synced.gemsCredited > 0) {
        await refreshBalance();
        toast.success(tStandalone("iap.purchasesRestored"));
        return true;
      }

      toast.info(tStandalone("iap.noPreviousPurchases"));
      return false;
    } catch (error: any) {
      console.error("Restore error:", error);
      toast.error(tStandalone("iap.restoreFailed"));
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [user, refreshBalance]);

  // Get product by ID
  const getProduct = useCallback((productId: string): IAPProduct | undefined => {
    return products.find(p => p.productId === productId);
  }, [products]);

  return {
    products,
    loading,
    purchasing,
    isInitialized,
    purchase,
    restorePurchases,
    getProduct,
    IAP_PRODUCTS,
  };
}

/**
 * Keep asking for the credit after the user has been let go.
 *
 * Runs detached: nothing awaits it, so the shop stays interactive and the
 * spinner is already gone. It exists because RevenueCat's REST subscriber
 * record is eventually consistent and sandbox is slow — the transaction is
 * real from the moment the sheet closes, but the server cannot see it yet.
 *
 * Bounded at roughly a minute. Past that the webhook has had every chance,
 * and Restore covers a player who somehow still has nothing.
 */
async function pollForCredit(onCredited: () => Promise<void>): Promise<void> {
  for (const wait of [2000, 4000, 8000, 15000, 30000]) {
    await new Promise((r) => setTimeout(r, wait));
    const result = await syncEntitlements();
    if (result.success && result.gemsCredited > 0) {
      iapLog(`credited ${result.gemsCredited} gems after waiting`);
      await onCredited();
      return;
    }
  }

  // The webhook may still land after this gives up, so re-read the balance
  // once more rather than leaving a stale number on screen.
  iapLog("no credit seen within a minute; leaving it to the webhook");
  await onCredited();
}

interface EntitlementSync {
  success: boolean;
  tier: string | null;
  gemsCredited: number;
}

/**
 * Ask the server to re-read this user's purchases from RevenueCat and write
 * whatever it finds.
 *
 * Deliberately argument-free. The endpoint identifies the user from their JWT
 * and the purchases from RevenueCat's API, so there is nothing useful the
 * client could contribute and nothing it could forge. It used to take a
 * transaction id, a product id and a user id, all of which it was believed.
 */
async function syncEntitlements(): Promise<EntitlementSync> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-receipt");

    if (error) throw error;
    return {
      success: data?.success === true,
      tier: data?.tier ?? null,
      gemsCredited: data?.gemsCredited ?? 0,
    };
  } catch (error) {
    console.error("Entitlement sync error:", error);
    return { success: false, tier: null, gemsCredited: 0 };
  }
}
