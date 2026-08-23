import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useInAppPurchases } from "@/hooks/useInAppPurchases";
import { GEM_PACK_PRODUCTS } from "@/config/gemPacks";
import { useLanguage } from "@/contexts/LanguageContext";

interface GemProduct {
  id: string;
  name: string;
  gems: number;
  priceGel: number;
  bonusPercentage?: number;
}

export function useGemPurchase() {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { purchase: nativePurchase, purchasing: nativePurchasing } = useInAppPurchases();

  const initiateCheckout = async (product: GemProduct) => {
    if (!user) {
      toast.error(t("extra.signInForPurchase"));
      return;
    }

    // Native platforms must buy gems through the store. Gems are consumed
    // inside the app, so sending an iOS user to a web payment page for them
    // breaks App Store guideline 3.1.1 — which is what this hook did on every
    // platform before, because it had no native branch at all.
    if (Capacitor.isNativePlatform()) {
      // Keyed by pack id, not gem count. The count is base + bonus, so keying
      // on it meant adding a bonus to a pack silently unmapped its SKU — which
      // is how three of the shop's four packs came to be dead on iOS.
      const productId = GEM_PACK_PRODUCTS[product.id];

      if (!productId) {
        // A pack with no store SKU cannot be sold here, and falling through to
        // the web path would be the exact violation. Fail loudly instead.
        console.error(`No store product configured for pack ${product.id}`);
        toast.error(t("extra.iapItemUnavailable"));
        return;
      }

      // Gems are credited server-side from the verified purchase; there is no
      // client-side grant to make here.
      await nativePurchase(productId);
      return;
    }

    // Web platform — Stripe.
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-gem-checkout", {
        // `productId` is the only field the server reads. It looks up how many
        // gems the pack grants and what it costs; taking those from the request
        // is what let a signed-in caller name their own price.
        //
        // `gems` and `priceGel` are sent anyway, and ignored. The client and
        // the edge functions deploy through different pipelines — Cloudflare
        // from a merge, Supabase from a separate functions deploy — so there is
        // always a window where one is new and the other is not. The new
        // function ignores extra fields, but the *old* one rejects the request
        // without them ("Missing required fields"), which would take gem
        // checkout down on the web for the length of that window.
        //
        // Safe to drop once the deployed functions are known to be current;
        // pointless to drop before then.
        body: {
          productId: product.id,
          gems: product.gems,
          priceGel: product.priceGel,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        if (data.error === "STRIPE_NOT_CONFIGURED") {
          toast.error(t("extra.ppPaymentNotConfigured"));
          return;
        }
        throw new Error(data.error);
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(t("extra.ppPaymentStartFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    initiateCheckout,
    isProcessing: isProcessing || nativePurchasing,
  };
}
