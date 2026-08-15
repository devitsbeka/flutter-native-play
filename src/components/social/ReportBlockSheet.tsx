import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Ban, ArrowLeft, Loader2 } from "lucide-react";
import {
  useContentModeration,
  REPORT_REASONS,
  type ReportReason,
} from "@/hooks/useContentModeration";
import { useLanguage } from "@/contexts/LanguageContext";
import { SafeAvatar } from "@/components/shared/SafeAvatar";

interface ReportBlockSheetProps {
  open: boolean;
  onClose: () => void;
  /** The author being reported or blocked. */
  userId: string;
  /** Shown in the confirmation copy. */
  displayName?: string;
  /**
   * Their picture, shown beside the name at the top of the sheet. A name on
   * its own is easy to misread as the name of the sheet rather than the
   * person it is about — which matters here, where one of the two choices is
   * irreversible from the reader's side.
   */
  avatarUrl?: string | null;
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
  avatarUrl,
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
                {/* Who this is about: face, name, and what the sheet is for.
                    The name used to sit alone as a heading, which read as the
                    sheet's own title. */}
                <div className="mb-4 flex items-center gap-3">
                  <SafeAvatar
                    avatarUrl={avatarUrl}
                    fallback={displayName || "?"}
                    className="h-11 w-11 shrink-0"
                    fallbackClassName="text-sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold leading-tight text-foreground">
                      {displayName || t("moderation.thisPlayer")}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {t("moderation.sheetSubtitle")}
                    </p>
                  </div>
                </div>

                {/* The two choices, as one group. They were separate blocks
                    with 16px of padding all round and nothing between them,
                    so the space inside a row and the space between rows were
                    the same and the pair did not read as a list. */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setView("reasons")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left hover:bg-muted"
                  >
                    <Flag className="h-5 w-5 shrink-0 text-amber-500" />
                    <span className="flex-1 font-medium text-foreground">
                      {t("moderation.report")}
                    </span>
                  </button>

                  <button
                    onClick={() => setView("confirmBlock")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left hover:bg-destructive/10"
                  >
                    <Ban className="h-5 w-5 shrink-0 text-destructive" />
                    <span className="flex-1 font-medium text-destructive">
                      {t("moderation.block")}
                    </span>
                  </button>
                </div>

                {/* Separated from the choices and given a surface of its own,
                    so leaving does not look like a third thing to do to this
                    player. */}
                <button
                  onClick={close}
                  className="mt-3 h-12 w-full rounded-2xl bg-muted font-semibold text-foreground hover:bg-muted/70"
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

                {/* Same rhythm as the menu behind it — these were the same
                    padding-only blocks. */}
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
