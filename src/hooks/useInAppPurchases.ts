import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Product IDs configured in App Store Connect
export const IAP_PRODUCTS = {
  VIP_MONTHLY: "io.mytrivia.vip.monthly",
  VIP_ANNUAL: "io.mytrivia.vip.annual",
  AD_FREE: "io.mytrivia.adfree",
} as const;

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

        // Get platform-specific API key
        const platform = Capacitor.getPlatform();
        const apiKey = platform === "ios" 
          ? (import.meta.env.VITE_REVENUECAT_IOS_API_KEY || "appl_CONFIGURE_IN_ENV")
          : (import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY || "goog_CONFIGURE_IN_ENV");

        // Configure RevenueCat
        await plugin.setLogLevel({ level: LOG_LEVEL?.DEBUG || "DEBUG" });
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
        // Get transaction info for verification
        const transactionId = customerInfo.originalAppUserId || customerInfo.originalApplicationVersion || Date.now().toString();
        
        // Verify receipt on server
        const verifyResult = await verifyReceiptOnServer(
          transactionId,
          productId,
          user.id
        );

        if (verifyResult.success) {
          toast.success("Purchase completed! 🎉");
          return { 
            success: true, 
            transactionId 
          };
        } else {
          throw new Error("Receipt verification failed");
        }
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

      const { customerInfo } = await plugin.restorePurchases();

      // Check for active entitlements
      const activeEntitlements = customerInfo?.entitlements?.active;
      const hasActiveEntitlements = activeEntitlements && Object.keys(activeEntitlements).length > 0;

      // Check for non-subscription purchases
      const nonSubscriptions = customerInfo?.nonSubscriptionTransactions || [];

      if (hasActiveEntitlements || nonSubscriptions.length > 0) {
        // Sync with server - verify each active entitlement
        if (activeEntitlements) {
          for (const entitlementId of Object.keys(activeEntitlements)) {
            const entitlement = activeEntitlements[entitlementId];
            await verifyReceiptOnServer(
              customerInfo.originalAppUserId || entitlementId,
              entitlement.productIdentifier || entitlementId,
              user.id
            );
          }
        }

        // Also verify non-subscription purchases (like ad-free)
        for (const transaction of nonSubscriptions) {
          await verifyReceiptOnServer(
            transaction.transactionIdentifier || transaction.productIdentifier,
            transaction.productIdentifier,
            user.id
          );
        }

        toast.success("Purchases restored! 🎉");
        return true;
      } else {
        toast.info("No previous purchases found");
        return false;
      }
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

// Helper function to verify receipt on server
async function verifyReceiptOnServer(
  receiptData: string,
  productId: string,
  userId: string
): Promise<{ success: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-receipt", {
      body: {
        receiptData,
        productId,
        userId,
      },
    });

    if (error) throw error;
    return { success: data?.success || false };
  } catch (error) {
    console.error("Receipt verification error:", error);
    return { success: false };
  }
}
