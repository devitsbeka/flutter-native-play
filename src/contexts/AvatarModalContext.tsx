import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AvatarModal } from "@/components/home/AvatarModal";

interface AvatarModalContextType {
  openAvatarModal: (onComplete?: () => void) => void;
  closeAvatarModal: () => void;
  isOpen: boolean;
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

  const handleGeneratingChange = useCallback((active: boolean, thumb?: string | null) => {
    const finishedInBackground = generatingRef.current && !active && !isOpenRef.current;
    generatingRef.current = active;
    setGenerating((prev) => ({ active, thumb: thumb !== undefined ? thumb : prev.thumb }));
    if (finishedInBackground) setIsOpen(true);
  }, []);

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
    <AvatarModalContext.Provider value={{ openAvatarModal, closeAvatarModal, isOpen }}>
      {children}
      <AvatarModal
        isOpen={isOpen}
        onClose={closeAvatarModal}
        onComplete={handleComplete}
        onGeneratingChange={handleGeneratingChange}
      />
      {/* Floating mini circle while a generation keeps running behind a
          closed modal - tapping it brings the modal back */}
      <AnimatePresence>
        {generating.active && !isOpen && (
          <motion.button
            type="button"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, scale: 0.5, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 16 }}
            className="fixed bottom-6 right-6 z-[95] h-16 w-16 rounded-full shadow-xl"
            aria-label="ავატარი იქმნება"
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
        )}
      </AnimatePresence>
    </AvatarModalContext.Provider>
  );
}
