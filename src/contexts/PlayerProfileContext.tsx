import React, { createContext, useContext, useState, useCallback } from "react";
import { PlayerProfileModal } from "@/components/profile/PlayerProfileModal";
import { useVipBenefitsAutoGrant } from "@/hooks/useVipBenefitsAutoGrant";

/** How a profile was opened, which changes what it is allowed to show. */
export interface OpenProfileOptions {
  /** Drop the trivias tab — see PlayerProfileModal's prop for why. */
  hideTrivias?: boolean;
}

interface PlayerProfileContextType {
  openProfile: (userId: string, options?: OpenProfileOptions) => void;
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
  const [options, setOptions] = useState<OpenProfileOptions>({});

  // Auto-grant VIP daily power-ups on login
  useVipBenefitsAutoGrant();

  const openProfile = useCallback((userId: string, opts?: OpenProfileOptions) => {
    setOptions(opts ?? {});
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
        hideTrivias={options.hideTrivias}
      />
    </PlayerProfileContext.Provider>
  );
}
