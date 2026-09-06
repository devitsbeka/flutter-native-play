import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { AvatarModal } from "@/components/home/AvatarModal";
import { t } from "@/lib/i18n";

interface AvatarModalContextType {
  openAvatarModal: (onComplete?: () => void) => void;
  closeAvatarModal: () => void;
  isOpen: boolean;
  /**
   * Report long-running avatar work to the shell, from anywhere.
   *
   * The floating bubble was wired to this modal alone, so animating from the
   * profile reel — which takes minutes — had nothing to show for itself at
   * all. Passing `"animation"` shows the bubble without the modal reappearing
   * when it lands.
   */
  reportGenerating: (
    active: boolean,
    thumb?: string | null,
    kind?: "generation" | "animation",
  ) => void;
  /** Whether a generation is running, and the photo it was started from. */
  generating: { active: boolean; thumb: string | null };
  /**
   * Claim the job of showing that a generation is running.
   *
   * A surface that draws the progress on the player's own avatar calls this
   * on mount and drops the returned handle on unmount. While at least one is
   * mounted the shell keeps its floating bubble down — two indicators for one
   * job is one too many, and the avatar is the one the owner asked for.
   */
  registerSelfIndicator: () => () => void;
}

const AvatarModalContext = createContext<AvatarModalContextType | null>(null);

export function useAvatarModal() {
  const context = useContext(AvatarModalContext);
  if (!context) {
    // Return a no-op fallback for components that might render during initial load
    return {
      openAvatarModal: () => {},
      closeAvatarModal: () => {},
      isOpen: false,
      reportGenerating: () => {},
      generating: { active: false, thumb: null },
      registerSelfIndicator: () => () => {},
    };
  }
  return context;
}

export function AvatarModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const onCompleteRef = useRef<(() => void) | null>(null);

  // Generation-in-progress indicator: closing the modal mid-generation
  // leaves a floating mini circle; when the result lands the modal
  // reopens itself on the preview.
  const [generating, setGenerating] = useState<{ active: boolean; thumb: string | null }>({
    active: false,
    thumb: null,
  });
  const isOpenRef = useRef(false);
  isOpenRef.current = isOpen;
  const generatingRef = useRef(false);
  // Whether finishing should bring the modal back. A new avatar or scene has
  // to be chosen — that is the whole point of reopening on the preview. An
  // animation has nothing to choose: it replaces the homepage loop by
  // itself, and it runs for minutes, so throwing the modal back up long
  // after the player moved on would interrupt whatever they went to do.
  const reopenRef = useRef(true);
  // Where the player last put the bubble. Motion values rather than state or
  // an `animate` prop: drag writes straight to these, and an `animate={{x,y}}`
  // alongside `drag` fights the gesture — any re-render mid-drag snaps the
  // bubble back to where the prop says it should be. They live here, above
  // the bubble's own mount, so the position survives to the next generation.
  const bubbleX = useMotionValue(0);
  const bubbleY = useMotionValue(0);
  const dragBounds = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  // How many surfaces are drawing the progress on the player's own avatar.
  // The bubble is the fallback for screens that have none, not the primary
  // indicator: see `registerSelfIndicator`.
  const [selfIndicators, setSelfIndicators] = useState(0);

  const registerSelfIndicator = useCallback(() => {
    setSelfIndicators((n) => n + 1);
    return () => setSelfIndicators((n) => Math.max(0, n - 1));
  }, []);

  const handleGeneratingChange = useCallback(
    (active: boolean, thumb?: string | null, kind: "generation" | "animation" = "generation") => {
      const finishedInBackground = generatingRef.current && !active && !isOpenRef.current;
      generatingRef.current = active;
      if (active) reopenRef.current = kind === "generation";
      setGenerating((prev) => ({ active, thumb: thumb !== undefined ? thumb : prev.thumb }));
      if (finishedInBackground && reopenRef.current) setIsOpen(true);
    },
    [],
  );

  const openAvatarModal = useCallback((onComplete?: () => void) => {
    onCompleteRef.current = onComplete || null;
    setIsOpen(true);
  }, []);

  const closeAvatarModal = useCallback(() => {
    setIsOpen(false);
    onCompleteRef.current = null;
  }, []);

  const handleComplete = useCallback(() => {
    const cb = onCompleteRef.current;
    setIsOpen(false);
    onCompleteRef.current = null;
    cb?.();
  }, []);

  return (
    <AvatarModalContext.Provider
      value={{
        openAvatarModal,
        closeAvatarModal,
        isOpen,
        reportGenerating: handleGeneratingChange,
        generating,
        registerSelfIndicator,
      }}
    >
      {children}
      <AvatarModal
        isOpen={isOpen}
        onClose={closeAvatarModal}
        onComplete={handleComplete}
        onGeneratingChange={handleGeneratingChange}
      />
      {/* Floating mini circle while a generation keeps running behind a
          closed modal — tapping it brings the modal back.

          The fallback, not the indicator. A generation is news about YOUR
          avatar, so where the player's own avatar is on screen the progress
          is drawn on it (`useAvatarGenerationIndicator`) and this stays down:
          a chip in the corner made the player hunt for what it referred to,
          and it sat over the bottom nav to do it. On a screen that shows no
          avatar of yours nothing else could carry the news, so the bubble
          still appears there.

          It used to sit at `bottom-6 right-6`, which is on top of the last
          item of the bottom nav: the thing that says "still working" covered
          the button for online games, on every screen, for the length of the
          generation. It now clears the nav and the home indicator, and it can
          be dragged anywhere inside the safe area if it is still in the way
          of something. */}
      <AnimatePresence>
        {generating.active && !isOpen && selfIndicators === 0 && (
          /* The fade lives on this wrapper, not on the button. Only a direct
             motion child of AnimatePresence gets to run its exit, and the
             button has to stay the draggable element. */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] pointer-events-none safe-screen"
          >
            {/* The drag boundary is this inner box rather than the viewport,
                so the bubble cannot be parked under the status bar or behind
                the home indicator — absolute insets resolve against the
                padding box, which is exactly the safe region. */}
            <div ref={dragBounds} className="relative h-full w-full">
              <motion.button
                type="button"
                drag
                dragConstraints={dragBounds}
                dragMomentum={false}
                dragElastic={0.05}
                // Reset on every press: a drag that ends without a click would
                // otherwise leave the flag set and swallow the next real tap.
                onPointerDown={() => { draggedRef.current = false; }}
                onDragStart={() => { draggedRef.current = true; }}
                onClick={() => { if (!draggedRef.current) setIsOpen(true); }}
                className="pointer-events-auto touch-none absolute right-4 h-16 w-16 rounded-full shadow-xl"
                style={{ x: bubbleX, y: bubbleY, bottom: "calc(var(--bottom-nav-height) + 1rem)" }}
                aria-label={t("avatar.generating")}
              >
                <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-purple-500 border-t-transparent" />
                <span className="absolute inset-[3px] overflow-hidden rounded-full bg-white">
                  {generating.thumb ? (
                    <img src={generating.thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl">⏳</span>
                  )}
                </span>
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs shadow">
                  ⏳
                </span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AvatarModalContext.Provider>
  );
}

/**
 * Draw "your new avatar is being made" on the player's own avatar.
 *
 * Mounting this claims the job from the shell's floating bubble, which is
 * why it registers rather than merely reading: two indicators for one
 * generation is one too many, and the owner's ask was that the news appear
 * on the avatar it is about rather than in a corner of the screen.
 *
 * `thumb` is the photo the generation was started from. Showing it in place
 * of the current avatar answers "which one is being made" for the minute the
 * work takes, and it is the same picture the bubble used to carry.
 */
export function useAvatarGenerationIndicator() {
  const context = useContext(AvatarModalContext);
  const register = context?.registerSelfIndicator;
  const openAvatarModal = context?.openAvatarModal;

  useEffect(() => register?.(), [register]);

  return {
    active: context?.generating.active ?? false,
    thumb: context?.generating.thumb ?? null,
    /** Tapping a running indicator reopens the studio it belongs to. */
    open: useCallback(() => openAvatarModal?.(), [openAvatarModal]),
  };
}
