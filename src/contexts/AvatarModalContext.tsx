import React, { createContext, useContext, useState, useCallback, useRef } from "react";
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
      />
    </AvatarModalContext.Provider>
  );
}
