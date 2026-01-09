import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { NotificationModal, NotificationType } from "@/components/ui/notification-modal";

interface NotificationOptions {
  title: string;
  description?: string;
  icon?: string | React.ReactNode;
  duration?: number;
  imageUrl?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

interface NotificationContextType {
  showNotification: (type: NotificationType, options: NotificationOptions | string) => void;
  hideNotification: () => void;
}

const NotificationModalContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationState {
  isOpen: boolean;
  type: NotificationType;
  title: string;
  description?: string;
  icon?: string | React.ReactNode;
  duration?: number;
  imageUrl?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export function NotificationModalProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: "info",
    title: "",
  });

  const showNotification = useCallback(
    (type: NotificationType, options: NotificationOptions | string) => {
      const opts = typeof options === "string" ? { title: options } : options;
      setNotification({
        isOpen: true,
        type,
        ...opts,
      });
    },
    []
  );

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <NotificationModalContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        description={notification.description}
        icon={notification.icon}
        duration={notification.duration}
        imageUrl={notification.imageUrl}
        actionButton={notification.actionButton}
        secondaryButton={notification.secondaryButton}
      />
    </NotificationModalContext.Provider>
  );
}

export function useNotificationModalContext() {
  const context = useContext(NotificationModalContext);
  if (!context) {
    throw new Error("useNotificationModalContext must be used within NotificationModalProvider");
  }
  return context;
}
