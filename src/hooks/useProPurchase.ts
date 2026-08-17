import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { t as tStandalone } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { useInAppPurchases, IAP_PRODUCTS } from "@/hooks/useInAppPurchases";

export type ProTierId = "pro" | "pro_plus";

// Mapping from tier ID to RevenueCat product IDs for native
const TIER_TO_NATIVE_PRODUCT: Record<ProTierId, string> = {
  pro: IAP_PRODUCTS.PRO_MONTHLY,
  pro_plus: IAP_PRODUCTS.PRO_PLUS_MONTHLY,
};

export function useProPurchase() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { purchase: nativePurchase, purchasing: nativePurchasing } = useInAppPurchases();

  const initiateProCheckout = async (tierId: ProTierId): Promise<{ success: boolean; error?: string }> => {
    // Check if we're on native platform - use RevenueCat
    if (Capacitor.isNativePlatform()) {
      const productId = TIER_TO_NATIVE_PRODUCT[tierId];
      const result = await nativePurchase(productId);
      return result;
    }

    // Web platform - use Stripe
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-pro-checkout", {
        body: { tierId },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        if (data.error === "STRIPE_NOT_CONFIGURED") {
          toast.error(tStandalone("extra.ppPaymentNotConfigured"));
          return { success: false, error: "STRIPE_NOT_CONFIGURED" };
        }
        throw new Error(data.error);
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        return { success: true };
      }

      return { success: false, error: "No checkout URL returned" };
    } catch (error) {
      console.error("PRO Checkout error:", error);
      toast.error(tStandalone("extra.ppPaymentStartFailed"));
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    initiateProCheckout,
    isProcessing: isProcessing || nativePurchasing,
  };
}
