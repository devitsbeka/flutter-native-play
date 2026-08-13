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
export { GEM_PACK_PRODUCTS } from "@/config/gemPacks";

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

        setProducts(mappedProducts);
        setIsInitialized(true);
        console.log("RevenueCat initialized, products:", mappedProducts);
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
        // Fallback: purchase by product ID directly
        const result = await plugin.purchaseStoreProduct({
          product: { identifier: productId }
        });
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

      return { success: false, error: "Purchase failed" };
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
