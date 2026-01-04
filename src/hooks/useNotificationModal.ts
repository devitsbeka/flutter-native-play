import { useCallback, useMemo } from "react";
import { useNotificationModalContext } from "@/contexts/NotificationModalContext";

interface NotifyOptions {
  description?: string;
  icon?: string | React.ReactNode;
  duration?: number;
}

export function useNotificationModal() {
  const { showNotification, hideNotification } = useNotificationModalContext();

  const notify = useMemo(
    () => ({
      info: (title: string, optionsOrDescription?: NotifyOptions | string) => {
        const opts =
          typeof optionsOrDescription === "string"
            ? { description: optionsOrDescription }
            : optionsOrDescription || {};
        showNotification("info", { title, ...opts });
      },
      success: (title: string, optionsOrDescription?: NotifyOptions | string) => {
        const opts =
          typeof optionsOrDescription === "string"
            ? { description: optionsOrDescription }
            : optionsOrDescription || {};
        showNotification("success", { title, ...opts });
      },
      error: (title: string, optionsOrDescription?: NotifyOptions | string) => {
        const opts =
          typeof optionsOrDescription === "string"
            ? { description: optionsOrDescription }
            : optionsOrDescription || {};
        showNotification("error", { title, ...opts });
      },
      warning: (title: string, optionsOrDescription?: NotifyOptions | string) => {
        const opts =
          typeof optionsOrDescription === "string"
            ? { description: optionsOrDescription }
            : optionsOrDescription || {};
        showNotification("warning", { title, ...opts });
      },
    }),
    [showNotification]
  );

  return { notify, hideNotification };
}
