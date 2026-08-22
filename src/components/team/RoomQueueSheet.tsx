import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shuffle, Library } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import type { QueueItem } from "@/hooks/useRoomCategoryQueue";

interface RoomQueueSheetProps {
  isOpen: boolean;
  onClose: () => void;
  queue: QueueItem[];
}

/**
 * What is coming after this round.
 *
 * The results screen showed the next item and, when there were more, a
 * "+3" with a chevron beside it — which reads as something you can open,
 * and was not. A player waiting on the host to pick could see that three
 * more rounds existed and had no way to find out what they were.
 *
 * The chevron opens this. It is a plain list, scrollable because a host can
 * queue as many as they like, and it is read-only: the queue belongs to
 * whoever is building it.
 */
export function RoomQueueSheet({ isOpen, onClose, queue }: RoomQueueSheetProps) {
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const labelFor = (item: QueueItem) =>
    item.source_type === "random"
      ? t("extra.randomOption")
      : localizeCategory(item.category_name || "") || t("extra.categoryType");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[24px] bg-[#2E1065] pb-[calc(1rem_+_var(--safe-bottom))]"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-display text-lg font-bold text-white">
                {t("extra.queueSheetTitle")}{" "}
                <span className="text-white/50">({queue.length})</span>
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Scrollable: a host can queue more rounds than fit on a phone. */}
            <div className="max-h-[55vh] space-y-2 overflow-y-auto px-5 pb-2">
              {queue.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/50">
                  {t("extra.queueSheetEmpty")}
                </p>
              ) : (
                queue.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    {/* Position, so "what is next" is answered at a glance. */}
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-white/40">
                      {index + 1}
                    </span>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                      {item.category_id === "__mixed__" ? (
                        <DynamicIcon slug="mystery-box" size={20} />
                      ) : item.source_type === "random" ? (
                        <Shuffle className="h-5 w-5 text-purple-300" />
                      ) : item.icon_slug ? (
                        <DynamicIcon slug={item.icon_slug} size={20} />
                      ) : (
                        <Library className="h-5 w-5 text-purple-300" />
                      )}
                    </div>
                    {/* Wraps rather than truncating — the same reason the
                        picker's cards do. */}
                    <span className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-white">
                      {labelFor(item)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
