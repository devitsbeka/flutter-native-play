import { useState, useCallback, useEffect, useRef } from "react";
import { useVipStatus } from "@/hooks/useVipStatus";

export type ProFeature = "rooms" | "trivia" | "collection" | "avatar" | "animation" | "general";

export function useProGating() {
  const { isVip, loading } = useVipStatus();
  const [showProModal, setShowProModal] = useState(false);
  const [gatedFeature, setGatedFeature] = useState<ProFeature>("general");

  // Requests made while VIP status is still loading are queued (latest wins)
  // and resolved once — never auto-passed and never double-fired.
  const pendingRef = useRef<{ feature: ProFeature; callback: () => void } | null>(null);

  const resolveGate = useCallback(
    (feature: ProFeature, callback: () => void) => {
      if (isVip) {
        callback();
      } else {
        setGatedFeature(feature);
        setShowProModal(true);
      }
    },
    [isVip]
  );

  useEffect(() => {
    if (!loading && pendingRef.current) {
      const { feature, callback } = pendingRef.current;
      pendingRef.current = null;
      resolveGate(feature, callback);
    }
  }, [loading, resolveGate]);

  const requirePro = useCallback(
    (feature: ProFeature, callback: () => void) => {
      if (loading) {
        pendingRef.current = { feature, callback };
        return;
      }
      resolveGate(feature, callback);
    },
    [loading, resolveGate]
  );

  return {
    isVip,
    loading,
    requirePro,
    showProModal,
    setShowProModal,
    gatedFeature,
  };
}
