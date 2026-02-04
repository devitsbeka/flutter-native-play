import { useState, useCallback } from "react";
import { useVipStatus } from "@/hooks/useVipStatus";

export type ProFeature = "rooms" | "trivia" | "collection" | "avatar" | "animation" | "general";

export function useProGating() {
  const { isVip, loading } = useVipStatus();
  const [showProModal, setShowProModal] = useState(false);
  const [gatedFeature, setGatedFeature] = useState<ProFeature>("general");

  const requirePro = useCallback((feature: ProFeature, callback: () => void) => {
    if (isVip) {
      callback();
    } else {
      setGatedFeature(feature);
      setShowProModal(true);
    }
  }, [isVip]);

  return {
    isVip,
    loading,
    requirePro,
    showProModal,
    setShowProModal,
    gatedFeature,
  };
}
