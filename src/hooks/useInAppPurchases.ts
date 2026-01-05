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

// Dynamic import for Capacitor Purchases
let CapacitorPurchases: any = null;

async function loadPurchasesPlugin() {
  if (CapacitorPurchases) return CapacitorPurchases;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const module = await import("@capgo/capacitor-purchases");
      CapacitorPurchases = module.CapacitorPurchases;
      return CapacitorPurchases;
    } catch (e) {
      console.warn("Failed to load Capacitor Purchases plugin:", e);
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

        // Initialize with API key
        // Note: For RevenueCat, the public API key is safe to include in client code
        // as it only allows read access to products. Replace with your key from RevenueCat dashboard.
        const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY || "appl_CONFIGURE_IN_ENV";
        
        await plugin.configure({
          apiKey,
        });

        // Fetch available products
        const { products: fetchedProducts } = await plugin.getProducts({
          productIdentifiers: Object.values(IAP_PRODUCTS),
        });

        setProducts(fetchedProducts || []);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize IAP:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Purchase a product
  const purchase = useCallback(async (productId: string): Promise<PurchaseResult> => {
    if (!user) {
      toast.error("გთხოვთ გაიაროთ ავტორიზაცია");
      return { success: false, error: "Not authenticated" };
    }

    if (!Capacitor.isNativePlatform()) {
      toast.error("შესყიდვა ხელმისაწვდომია მხოლოდ მობილურ აპლიკაციაში");
      return { success: false, error: "Not on native platform" };
    }

    setPurchasing(true);

    try {
      const plugin = await loadPurchasesPlugin();
      if (!plugin) {
        throw new Error("Purchase plugin not available");
      }

      // Initiate purchase
      const { customerInfo, productIdentifier } = await plugin.purchaseProduct({
        productIdentifier: productId,
      });

      if (customerInfo && productIdentifier) {
        // Verify receipt on server
        const verifyResult = await verifyReceiptOnServer(
          customerInfo.originalPurchaseDate,
          productId,
          user.id
        );

        if (verifyResult.success) {
          toast.success("შესყიდვა წარმატებით დასრულდა! 🎉");
          return { 
            success: true, 
            transactionId: customerInfo.originalAppUserId 
          };
        } else {
          throw new Error("Receipt verification failed");
        }
      }

      return { success: false, error: "Purchase failed" };
    } catch (error: any) {
      console.error("Purchase error:", error);
      
      // Handle user cancellation gracefully
      if (error.message?.includes("cancelled") || error.code === "1") {
        return { success: false, error: "cancelled" };
      }
      
      toast.error("შესყიდვა ვერ მოხერხდა");
      return { success: false, error: error.message };
    } finally {
      setPurchasing(false);
    }
  }, [user]);

  // Restore previous purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("გთხოვთ გაიაროთ ავტორიზაცია");
      return false;
    }

    if (!Capacitor.isNativePlatform()) {
      toast.info("აღდგენა ხელმისაწვდომია მხოლოდ მობილურ აპლიკაციაში");
      return false;
    }

    setPurchasing(true);

    try {
      const plugin = await loadPurchasesPlugin();
      if (!plugin) {
        throw new Error("Purchase plugin not available");
      }

      const { customerInfo } = await plugin.restorePurchases();

      if (customerInfo?.activeSubscriptions?.length > 0 || 
          customerInfo?.nonSubscriptionTransactions?.length > 0) {
        
        // Sync with server
        for (const subscription of customerInfo.activeSubscriptions || []) {
          await verifyReceiptOnServer(
            customerInfo.originalPurchaseDate,
            subscription,
            user.id
          );
        }

        toast.success("შესყიდვები აღდგენილია! 🎉");
        return true;
      } else {
        toast.info("წინა შესყიდვები ვერ მოიძებნა");
        return false;
      }
    } catch (error: any) {
      console.error("Restore error:", error);
      toast.error("აღდგენა ვერ მოხერხდა");
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
