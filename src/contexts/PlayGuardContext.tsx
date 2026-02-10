import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { usePlayLimit } from "@/hooks/usePlayLimit";
import { useAuth } from "@/hooks/useAuth";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { getGuestProgress } from "@/hooks/useGuestProgress";
import { useCategoryPlayLimit } from "@/hooks/useCategoryPlayLimit";
import { ProRequiredModal } from "@/components/shared/ProRequiredModal";

interface PlayGuardContextValue {
  /**
   * Call before any game-starting action.
   * Returns true if user can play (VIP or has remaining plays).
   * If user can't play, it shows the PlayLimitModal and returns false.
   * Auto-consumes regen play when allowing play with exhausted free games.
   */
  guardPlay: (onAllow?: () => void) => boolean;
  /**
   * Call before starting a category level.
   * Returns true if user can play (VIP or within limits).
   * Shows ProRequiredModal if blocked.
   */
  guardCategoryPlay: (categoryId: string, levelNumber?: number) => boolean;
}

const PlayGuardContext = createContext<PlayGuardContextValue | null>(null);

export function usePlayGuard() {
  const ctx = useContext(PlayGuardContext);
  if (!ctx) {
    throw new Error("usePlayGuard must be used within PlayGuardProvider");
  }
  return ctx;
}

export function PlayGuardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const {
    canPlay,
    isVip,
    regenPlayAvailable,
    freeGamesExhausted,
    timeUntilNextPlay,
    useRegenPlay,
  } = usePlayLimit();
  const { canPlayLevel } = useCategoryPlayLimit();

  const [showModal, setShowModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const onAllowRef = useRef<(() => void) | undefined>();

  const guardPlay = useCallback(
    (onAllow?: () => void) => {
      // Guests are handled separately by each page (Index.tsx)
      if (!user) return true;

      if (canPlay) {
        // If user can play but only via regen (free games exhausted), consume the regen
        // This is fire-and-forget: useRegenPlay immediately sets local state to block double-use
        if (freeGamesExhausted && regenPlayAvailable && !isVip) {
          useRegenPlay();
        }
        return true;
      }

      // User can't play — show modal
      onAllowRef.current = onAllow;
      setShowModal(true);
      return false;
    },
    [user, canPlay, freeGamesExhausted, regenPlayAvailable, isVip, useRegenPlay],
  );

  const guardCategoryPlay = useCallback(
    (categoryId: string, levelNumber?: number) => {
      if (!user) return true; // Guests handled by auth gates
      if (canPlayLevel(categoryId, levelNumber)) return true;
      setShowProModal(true);
      return false;
    },
    [user, canPlayLevel],
  );

  const handlePlayWithRegen = useCallback(async () => {
    const success = await useRegenPlay();
    if (success) {
      setShowModal(false);
      onAllowRef.current?.();
      onAllowRef.current = undefined;
    }
  }, [useRegenPlay]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    onAllowRef.current = undefined;
  }, []);

  return (
    <PlayGuardContext.Provider value={{ guardPlay, guardCategoryPlay }}>
      {children}
      <PlayLimitModal
        isOpen={showModal}
        onClose={handleClose}
        isGuest={false}
        regenPlayAvailable={regenPlayAvailable}
        timeUntilNextPlay={timeUntilNextPlay}
        onPlayWithRegen={handlePlayWithRegen}
      />
      <ProRequiredModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        feature="general"
      />
    </PlayGuardContext.Provider>
  );
}
