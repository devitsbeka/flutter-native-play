import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { usePlayLimit } from "@/hooks/usePlayLimit";
import { useAuth } from "@/hooks/useAuth";
import { PlayLimitModal } from "@/components/home/PlayLimitModal";
import { getGuestProgress } from "@/hooks/useGuestProgress";
import { useCategoryPlayLimit } from "@/hooks/useCategoryPlayLimit";
import { ProRequiredModal } from "@/components/shared/ProRequiredModal";
import { InviteFriendsModal } from "@/components/home/InviteFriendsModal";

interface PlayGuardContextValue {
  /**
   * Call before any game-starting action.
   * Returns true if user can play (VIP or has remaining plays).
   * If user can't play, it shows the PlayLimitModal and returns false.
   * Does not spend the play - /game does that when the game starts.
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
    loading: vipLoading,
    regenPlayAvailable,
    timeUntilNextPlay,
    useRegenPlay,
  } = usePlayLimit();
  const { canPlayLevel } = useCategoryPlayLimit();

  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const onAllowRef = useRef<(() => void) | undefined>();

  const guardPlay = useCallback(
    (onAllow?: () => void) => {
      // Guests are handled separately by each page (Index.tsx)
      if (!user) return true;
      // Never block while VIP status is still loading
      if (vipLoading) return true;

      // Deliberately does NOT spend the play. Every caller of guardPlay
      // navigates to /game, and Game.tsx spends it there - the one place a
      // game actually begins. Spending here as well would cost two plays
      // for one game. (The old code got away with double-consuming because
      // it only stamped a timestamp, which is idempotent; a counter is not.)
      if (canPlay) return true;

      // User can't play — show invite modal first, then play limit modal on dismiss
      onAllowRef.current = onAllow;
      setShowInviteModal(true);
      return false;
    },
    [user, canPlay, vipLoading],
  );

  const guardCategoryPlay = useCallback(
    (categoryId: string, levelNumber?: number) => {
      if (!user) return true; // Guests handled by auth gates
      if (vipLoading) return true; // Never block while VIP status loads
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
      <InviteFriendsModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onDismiss={() => setShowModal(true)}
      />
      <ProRequiredModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        feature="general"
      />
    </PlayGuardContext.Provider>
  );
}
