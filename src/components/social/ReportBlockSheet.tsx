import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Ban, ArrowLeft, Loader2 } from "lucide-react";
import {
  useContentModeration,
  REPORT_REASONS,
  type ReportReason,
} from "@/hooks/useContentModeration";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportBlockSheetProps {
  open: boolean;
  onClose: () => void;
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
 * The report-and-block sheet, shared by every surface showing someone else's
 * content.
 *
 * Guideline 1.2 wants both actions reachable from the content itself, not
 * buried in settings — so this is designed to be opened from an overflow
 * menu on a quiz post, a comment or a profile.
 */
export function ReportBlockSheet({
  open,
  onClose,
  userId,
  displayName,
  context,
  onBlocked,
}: ReportBlockSheetProps) {
  const { t } = useLanguage();
  const { reportUser, blockUser } = useContentModeration();
  const [view, setView] = useState<"menu" | "reasons" | "confirmBlock">("menu");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setView("menu");
    onClose();
  };

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
            {view === "menu" && (
              <>
                <h2 className="mb-1 text-lg font-bold text-foreground">
                  {displayName || t("moderation.thisPlayer")}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  {t("moderation.sheetSubtitle")}
                </p>

                <button
                  onClick={() => setView("reasons")}
                  className="flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:bg-muted"
                >
                  <Flag className="h-5 w-5 text-amber-500" />
                  <span className="flex-1 font-medium text-foreground">
                    {t("moderation.report")}
                  </span>
                </button>

                <button
                  onClick={() => setView("confirmBlock")}
                  className="flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:bg-destructive/10"
                >
                  <Ban className="h-5 w-5 text-destructive" />
                  <span className="flex-1 font-medium text-destructive">
                    {t("moderation.block")}
                  </span>
                </button>

                <button
                  onClick={close}
                  className="mt-2 h-12 w-full rounded-2xl font-semibold text-muted-foreground"
                >
                  {t("common.cancel")}
                </button>
              </>
            )}

            {view === "reasons" && (
              <>
                <button
                  onClick={() => setView("menu")}
                  className="mb-3 flex items-center gap-1 text-sm text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("common.back")}
                </button>
                <h2 className="mb-4 text-lg font-bold text-foreground">
                  {t("moderation.reportReasonTitle")}
                </h2>

                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    disabled={busy}
                    onClick={() => submitReport(reason)}
                    className="w-full rounded-2xl p-4 text-left font-medium text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {t(`moderation.reason.${reason}`)}
                  </button>
                ))}
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
                  onClick={() => setView("menu")}
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
