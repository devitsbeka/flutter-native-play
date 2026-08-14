import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useInAppPurchases } from "@/hooks/useInAppPurchases";
import { GEM_PACK_PRODUCTS } from "@/config/gemPacks";

interface GemProduct {
  id: string;
  name: string;
  gems: number;
  priceGel: number;
  bonusPercentage?: number;
}

export function useGemPurchase() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { purchase: nativePurchase, purchasing: nativePurchasing } = useInAppPurchases();

  const initiateCheckout = async (product: GemProduct) => {
    if (!user) {
      toast.error("გთხოვთ გაიაროთ ავტორიზაცია");
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
        toast.error("ეს პაკეტი ამჟამად მიუწვდომელია");
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
        body: {
          productId: product.id,
          gems: product.gems,
          priceGel: product.priceGel,
          productName: product.name,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        if (data.error === "STRIPE_NOT_CONFIGURED") {
          toast.error("გადახდის სისტემა არ არის კონფიგურირებული. გთხოვთ დაუკავშირდეთ ადმინისტრატორს.");
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
      toast.error("გადახდის დაწყება ვერ მოხერხდა. გთხოვთ სცადოთ მოგვიანებით.");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    initiateCheckout,
    isProcessing: isProcessing || nativePurchasing,
  };
}
