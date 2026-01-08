import React, { createContext, useContext, useState, useCallback } from "react";
import { PlayerProfileModal } from "@/components/profile/PlayerProfileModal";

interface PlayerProfileContextType {
  openProfile: (userId: string) => void;
  closeProfile: () => void;
  currentProfileUserId: string | null;
}

const PlayerProfileContext = createContext<PlayerProfileContextType | null>(null);

export function usePlayerProfile() {
  const context = useContext(PlayerProfileContext);
  if (!context) {
    throw new Error("usePlayerProfile must be used within PlayerProfileProvider");
  }
  return context;
}

export function PlayerProfileProvider({ children }: { children: React.ReactNode }) {
  const [currentProfileUserId, setCurrentProfileUserId] = useState<string | null>(null);

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
    </PlayerProfileContext.Provider>
  );
}
