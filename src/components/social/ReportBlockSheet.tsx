import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  useContentModeration,
  REPORT_REASONS,
  type ReportReason,
} from "@/hooks/useContentModeration";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportBlockSheetProps {
  open: boolean;
  onClose: () => void;
  /**
   * Which step to show. There is no menu step any more: the two choices are a
   * dropdown on the card's overflow button, so this opens straight at the
   * reason list or the block confirmation.
   */
  view: "reasons" | "confirmBlock";
  /** The author being reported or blocked. */
  userId: string;
  /** Shown in the confirmation copy. */
  displayName?: string;
  /** Optional content this is about, recorded on the report. */
  context?: { messageId?: string; roomId?: string };
  /** Called after a successful block, so the caller can dismiss the content. */
  onBlocked?: () => void;
}

/**
 * What happens after the overflow menu's choice: pick a reason, or confirm a
 * block.
 *
 * It used to open on a menu of its own — the same two choices, in a panel in
 * the middle of the feed, under the name and picture of the person whose row
 * you had just tapped. The choices are a dropdown on that button now, and
 * this is only the step after.
 *
 * Guideline 1.2 wants both actions reachable from the content itself rather
 * than from settings, which the dropdown satisfies.
 */
export function ReportBlockSheet({
  open,
  onClose,
  view,
  userId,
  displayName,
  context,
  onBlocked,
}: ReportBlockSheetProps) {
  const { t } = useLanguage();
  const { reportUser, blockUser } = useContentModeration();
  const [busy, setBusy] = useState(false);

  const close = () => onClose();

  const submitReport = async (reason: ReportReason) => {
    setBusy(true);
    await reportUser(userId, reason, undefined, context);
    setBusy(false);
    close();
  };

  const confirmBlock = async () => {
    setBusy(true);
    const ok = await blockUser(userId);
    setBusy(false);
    if (ok) onBlocked?.();
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] rounded-t-[28px] bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[28px]"
          >
            {view === "reasons" && (
              <>
                <button
                  onClick={close}
                  className="mb-3 flex items-center gap-1 text-sm text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("common.back")}
                </button>
                <h2 className="mb-4 text-lg font-bold text-foreground">
                  {t("moderation.reportReasonTitle")}
                </h2>

                {/* One group, even rhythm: these were padding-only blocks
                    with the same space inside a row as between rows. */}
                <div className="flex flex-col gap-1">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      disabled={busy}
                      onClick={() => submitReport(reason)}
                      className="w-full rounded-2xl px-4 py-3.5 text-left font-medium text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {t(`moderation.reason.${reason}`)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {view === "confirmBlock" && (
              <>
                <h2 className="mb-2 text-lg font-bold text-foreground">
                  {t("moderation.blockConfirmTitle")}
                </h2>
                <p className="mb-5 text-sm text-muted-foreground">
                  {t("moderation.blockConfirmBody")}
                </p>

                <button
                  disabled={busy}
                  onClick={confirmBlock}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-destructive font-bold text-destructive-foreground disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("moderation.block")}
                </button>
                <button
                  onClick={close}
                  className="mt-2 h-12 w-full rounded-2xl font-semibold text-muted-foreground"
                >
                  {t("common.cancel")}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
