import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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

  const initiateCheckout = async (product: GemProduct) => {
    if (!user) {
      toast.error("გთხოვთ გაიაროთ ავტორიზაცია");
      return;
    }

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
    isProcessing,
  };
}
