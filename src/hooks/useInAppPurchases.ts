import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  PRO_PLUS_MONTHLY: "io.mytrivia.proplus.monthly",
  AD_FREE: "io.mytrivia.adfree",
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

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Dynamic import for RevenueCat Purchases
let Purchases: any = null;
let LOG_LEVEL: any = null;

async function loadPurchasesPlugin() {
  if (Purchases) return Purchases;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const module = await import("@revenuecat/purchases-capacitor");
      Purchases = module.Purchases;
      LOG_LEVEL = module.LOG_LEVEL;
      return Purchases;
    } catch (e) {
      console.warn("Failed to load RevenueCat Purchases plugin:", e);
      return null;
    }
  }
  return null;
}

export function useInAppPurchases() {
  const { user } = useAuth();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the plugin and fetch products
  useEffect(() => {
    const initialize = async () => {
      if (!Capacitor.isNativePlatform()) {
        setLoading(false);
        return;
      }

      try {
        const plugin = await loadPurchasesPlugin();
        if (!plugin) {
          setLoading(false);
          return;
        }

        // Get platform-specific API key.
        //
        // No placeholder fallback. It used to default to
        // "appl_CONFIGURE_IN_ENV", which configure() accepts happily — then
        // getOfferings() returns nothing and the paywall renders with no
        // products at all. The only symptom was a console warning, so the
        // failure looked like "the store is empty today" rather than "nobody
        // set the key".
        const platform = Capacitor.getPlatform();
        const apiKey =
          platform === "ios"
            ? import.meta.env.VITE_REVENUECAT_IOS_API_KEY
            : import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY;

        if (!apiKey) {
          console.error(
            `[iap] No RevenueCat key for ${platform}. Purchases are disabled. ` +
            `Set VITE_REVENUECAT_${platform.toUpperCase()}_API_KEY.`,
          );
          setLoading(false);
          return;
        }

        // Verbose purchase logging is for development. In a release build it
        // writes transaction internals to the device console.
        await plugin.setLogLevel({
          level: import.meta.env.DEV ? (LOG_LEVEL?.DEBUG ?? "DEBUG") : (LOG_LEVEL?.ERROR ?? "ERROR"),
        });
        await plugin.configure({ apiKey });

        // If user is logged in, identify them in RevenueCat
        if (user?.id) {
          await plugin.logIn({ appUserID: user.id });
        }

        // Fetch offerings (products are organized in offerings)
        const offerings = await plugin.getOfferings();
        
        // Map offerings packages to our IAPProduct interface
        const mappedProducts: IAPProduct[] = [];
        
        if (offerings?.current?.availablePackages) {
          for (const pkg of offerings.current.availablePackages) {
            const product = pkg.storeProduct;
            if (product) {
              mappedProducts.push({
                productId: product.identifier,
                title: product.title || product.identifier,
                description: product.description || "",
                price: product.priceString || "",
                priceAmountMicros: Math.round((product.price || 0) * 1000000),
                priceCurrencyCode: product.currencyCode || "USD",
              });
            }
          }
        }

        // Also check all offerings for our specific products
        if (offerings?.all) {
          for (const offeringKey of Object.keys(offerings.all)) {
            const offering = offerings.all[offeringKey];
            for (const pkg of offering.availablePackages || []) {
              const product = pkg.storeProduct;
              if (product && !mappedProducts.find(p => p.productId === product.identifier)) {
                mappedProducts.push({
                  productId: product.identifier,
                  title: product.title || product.identifier,
                  description: product.description || "",
                  price: product.priceString || "",
                  priceAmountMicros: Math.round((product.price || 0) * 1000000),
                  priceCurrencyCode: product.currencyCode || "USD",
                });
              }
            }
          }
        }

        // Offerings came back with nothing in them. Ask StoreKit directly for
        // the ids we know about, rather than rendering a shop with no prices.
        //
        // An empty offering is a dashboard state — a product not added to a
        // package, a package pointing at the wrong id, an offering that isn't
        // current — and none of it is visible or fixable from the device. The
        // consequence without this was not a blank price but a *wrong* one:
        // useStorePrice falls back to the figure compiled into the bundle, and
        // for a Georgian user that fallback is 2.75x the USD number rendered
        // as ₾. An invented price next to a real App Store charge is exactly
        // what guideline 2.3.1 rejects for.
        if (mappedProducts.length === 0) {
          console.warn(
            "[iap] No offerings returned any products. Querying StoreKit " +
              "directly for known ids. Check the default offering in RevenueCat.",
          );
          try {
            const direct = await plugin.getProducts({
              productIdentifiers: ALL_PRODUCT_IDS,
            });
            for (const product of direct?.products ?? []) {
              mappedProducts.push({
                productId: product.identifier,
                title: product.title || product.identifier,
                description: product.description || "",
                price: product.priceString || "",
                priceAmountMicros: Math.round((product.price || 0) * 1000000),
                priceCurrencyCode: product.currencyCode || "USD",
              });
            }
          } catch (e) {
            console.error("[iap] Direct getProducts failed:", e);
          }
        }

        setProducts(mappedProducts);
        setIsInitialized(true);
        console.log("RevenueCat initialized, products:", mappedProducts);

        // Nothing from offerings *and* nothing from StoreKit means the store
        // itself is returning no products for this build — an unsigned Paid
        // Applications agreement, ids that don't exist in App Store Connect,
        // or a bundle id that doesn't match. Say so once, plainly, because
        // every downstream symptom (fallback prices, dead buy buttons) looks
        // like an app bug rather than a store one.
        if (mappedProducts.length === 0) {
          console.error(
            "[iap] StoreKit returned zero products for " +
              `${ALL_PRODUCT_IDS.length} known ids on ${platform}. Purchases ` +
              "cannot work in this build. Check: Paid Applications agreement " +
              "active in App Store Connect, product ids exist and are at " +
              "least 'Ready to Submit', and the bundle id matches.",
          );
        }
      } catch (error) {
        console.error("Failed to initialize IAP:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user?.id]);

  // Purchase a product
  const purchase = useCallback(async (productId: string): Promise<PurchaseResult> => {
    if (!user) {
      toast.error("Please sign in");
      return { success: false, error: "Not authenticated" };
    }

    if (!Capacitor.isNativePlatform()) {
      toast.error("Purchases only available in mobile app");
      return { success: false, error: "Not on native platform" };
    }

    setPurchasing(true);

    try {
      const plugin = await loadPurchasesPlugin();
      if (!plugin) {
        throw new Error("Purchase plugin not available");
      }

      // Get offerings to find the package for this product
      const offerings = await plugin.getOfferings();
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
        const found = await plugin.getProducts({ productIdentifiers: [productId] });
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
          toast.error("This item isn't available from the store right now.");
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
        const synced = await syncEntitlements();

        if (!synced.success) {
          // The money moved even though the sync didn't. Say so honestly
          // rather than reporting a failed purchase the user was charged for —
          // the webhook will settle it, and restore covers the rest.
          toast.error("Purchase went through, but activating it failed. It will appear shortly.");
          return { success: false, error: "sync_failed" };
        }

        toast.success("Purchase completed!");
        return { success: true };
      }

      // No customerInfo and no throw. This is what an unmatched product does:
      // the fallback above hands purchaseStoreProduct a hand-made
      // `{ identifier }` rather than a real StoreProduct, and it can resolve
      // without buying anything. Silent until now — the button simply did
      // nothing, which is indistinguishable from a dead tap handler.
      console.error(`[iap] ${productId} returned no customerInfo — nothing was purchased`);
      toast.error("The store did not respond. Please try again.");
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
      
      toast.error("Purchase failed");
      return { success: false, error: error.message };
    } finally {
      setPurchasing(false);
    }
  }, [user]);

  // Restore previous purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("Please sign in");
      return false;
    }

    if (!Capacitor.isNativePlatform()) {
      toast.info("Restore only available in mobile app");
      return false;
    }

    setPurchasing(true);

    try {
      const plugin = await loadPurchasesPlugin();
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
        toast.error("Restore failed");
        return false;
      }

      if (synced.tier || synced.gemsCredited > 0) {
        toast.success("Purchases restored!");
        return true;
      }

      toast.info("No previous purchases found");
      return false;
    } catch (error: any) {
      console.error("Restore error:", error);
      toast.error("Restore failed");
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [user]);

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
