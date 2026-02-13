import React, { createContext, useContext, useState, useCallback } from "react";
import { PlayerProfileModal } from "@/components/profile/PlayerProfileModal";
import { useVipBenefitsAutoGrant } from "@/hooks/useVipBenefitsAutoGrant";
import { BetaGiftModal, useReturnGiftEligibility } from "@/components/shared/BetaGiftModal";
import { FloatingGiftButton } from "@/components/shared/FloatingGiftButton";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useVipStatus } from "@/hooks/useVipStatus";

interface PlayerProfileContextType {
  openProfile: (userId: string) => void;
  closeProfile: () => void;
  currentProfileUserId: string | null;
}

const PlayerProfileContext = createContext<PlayerProfileContextType | null>(null);

export function usePlayerProfile() {
  const context = useContext(PlayerProfileContext);
  if (!context) {
    return {
      openProfile: () => {},
      closeProfile: () => {},
      currentProfileUserId: null,
    };
  }
  return context;
}

export function PlayerProfileProvider({ children }: { children: React.ReactNode }) {
  const [currentProfileUserId, setCurrentProfileUserId] = useState<string | null>(null);
  const { user } = useAuth();
  const { isVip, loading: vipLoading } = useVipStatus();

  // Auto-grant VIP daily power-ups on login
  useVipBenefitsAutoGrant();

  // Return gift state
  const isEligible = useReturnGiftEligibility();
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [pendingGift, setPendingGift] = useState(false);
  const [giftClaimed, setGiftClaimed] = useState(() => {
    try {
      if (!user) return false;
      return localStorage.getItem(`returnee_gift_claimed_${user.id}`) === "true";
    } catch {
      return false;
    }
  });

  // Sync giftClaimed when user changes
  React.useEffect(() => {
    if (user) {
      const claimed = localStorage.getItem(`returnee_gift_claimed_${user.id}`) === "true";
      setGiftClaimed(claimed);
    }
  }, [user?.id]);

  // Auto-open modal when eligible (with delay) — NEVER for VIP users
  React.useEffect(() => {
    if (isEligible && !giftClaimed && !isVip && !vipLoading) {
      const timer = setTimeout(() => setGiftModalOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isEligible, giftClaimed, isVip, vipLoading]);

  const handleGiftDismiss = useCallback(() => {
    setGiftModalOpen(false);
    setPendingGift(true);
  }, []);

  const handleGiftClaimed = useCallback(() => {
    setGiftModalOpen(false);
    setPendingGift(false);
    setGiftClaimed(true);
  }, []);

  const handleFloatingGiftClick = useCallback(() => {
    setPendingGift(false);
    setGiftModalOpen(true);
  }, []);

  const openProfile = useCallback((userId: string) => {
    setCurrentProfileUserId(userId);
  }, []);

  const closeProfile = useCallback(() => {
    setCurrentProfileUserId(null);
  }, []);

  return (
    <PlayerProfileContext.Provider value={{ openProfile, closeProfile, currentProfileUserId }}>
      {children}
      <PlayerProfileModal
        isOpen={!!currentProfileUserId}
        onClose={closeProfile}
        userId={currentProfileUserId}
      />
      <BetaGiftModal
        isOpen={giftModalOpen}
        onDismiss={handleGiftDismiss}
        onClaimed={handleGiftClaimed}
      />
      <AnimatePresence>
        {pendingGift && !giftModalOpen && (
          <FloatingGiftButton onClick={handleFloatingGiftClick} />
        )}
      </AnimatePresence>
    </PlayerProfileContext.Provider>
  );
}
