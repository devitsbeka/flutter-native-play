import React, { createContext, useContext, useState, useCallback } from "react";
import { AvatarModal } from "@/components/home/AvatarModal";

interface AvatarModalContextType {
  openAvatarModal: () => void;
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

  const openAvatarModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeAvatarModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AvatarModalContext.Provider value={{ openAvatarModal, closeAvatarModal, isOpen }}>
      {children}
      <AvatarModal
        isOpen={isOpen}
        onClose={closeAvatarModal}
      />
    </AvatarModalContext.Provider>
  );
}
