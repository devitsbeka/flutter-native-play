import { useMemo } from "react";
import { toast } from "sonner";
import { useNotificationModalContext } from "@/contexts/NotificationModalContext";

interface NotifyOptions {
  description?: string;
  icon?: string | React.ReactNode;
  duration?: number;
}

/**
 * `notify` is a toast, not a modal.
 *
 * It used to open a centred card with a dimmed backdrop and a close button —
 * for things like "invitation sent", which is an acknowledgement, not a
 * decision. Sending an invite therefore produced both: a toast at the top
 * saying it had been sent, and a modal in the middle saying the same thing,
 * with the second one blocking the screen until it was dismissed.
 *
 * Changed here rather than at the call sites because there are many of them
 * and they all want the same thing: say it and get out of the way. The API is
 * unchanged, so nothing else had to move.
 *
 * The modal itself and its context are still mounted — a genuine
 * stop-and-read still has a home — it just is not what an acknowledgement
 * reaches for by default.
 */
export function useNotificationModal() {
  const { hideNotification } = useNotificationModalContext();

  const notify = useMemo(() => {
    const show =
      (fn: typeof toast.success) =>
      (title: string, optionsOrDescription?: NotifyOptions | string) => {
        const opts =
          typeof optionsOrDescription === "string"
            ? { description: optionsOrDescription }
            : optionsOrDescription || {};
        fn(title, {
          description: opts.description,
          duration: opts.duration,
          // Sonner draws its own status glyph. A string icon here is an emoji
          // the old modal rendered large in the middle of the card; beside a
          // coloured tick it reads as two icons for one message.
          ...(opts.icon && typeof opts.icon !== "string" ? { icon: opts.icon } : {}),
        });
      };

    return {
      info: show(toast.info),
      success: show(toast.success),
      error: show(toast.error),
      warning: show(toast.warning),
    };
  }, []);

  return { notify, hideNotification };
}
