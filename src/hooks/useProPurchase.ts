import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { t as tStandalone } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { useInAppPurchases, IAP_PRODUCTS } from "@/hooks/useInAppPurchases";
import { readAppLanguage } from "@/utils/appLanguage";

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

  /**
   * @param tierId   What the purchase grants. Stripe prices by tier, so this
   *                 is all the web path has to go on.
   * @param nativeProductId  Which App Store product to ring up, when the
   *                 caller is selling a specific one — the paywall's annual
   *                 plan grants the same tier as monthly and differs only in
   *                 the SKU. Omitted, the tier's default monthly product is
   *                 used, which is what every existing caller wants.
   * @param period   Which billing interval Stripe should charge on the web.
   *                 "year" needs a yearly price configured for the tier in
   *                 create-pro-checkout; without one it bills monthly and
   *                 says so in the log rather than guessing a yearly figure.
   */
  const initiateProCheckout = async (
    tierId: ProTierId,
    nativeProductId?: string,
    period?: "month" | "year",
  ): Promise<{ success: boolean; error?: string }> => {
    // Check if we're on native platform - use RevenueCat
    if (Capacitor.isNativePlatform()) {
      const productId = nativeProductId ?? TIER_TO_NATIVE_PRODUCT[tierId];
      const result = await nativePurchase(productId);
      return result;
    }

    // Web platform - use Stripe
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-pro-checkout", {
        // The language decides the currency and the words on Stripe's page.
        // Sent rather than inferred server-side: the buyer's app language is
        // what every price in the app was quoted in, and an Accept-Language
        // header is the browser's, which is often a different answer.
        body: { tierId, period, language: readAppLanguage() },
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
