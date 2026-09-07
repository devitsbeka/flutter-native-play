import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  useContentModeration,
  REPORT_REASONS,
  type ReportReason,
} from "@/hooks/useContentModeration";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

/** What a report can be about, beyond the person who posted it. */
export type ReportedContentType = "quiz" | "room" | "message" | "profile";

/** user_reports.content_id is a uuid column; a sample post's id is not one. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** As much free text as is useful to read in a list; the column is unbounded. */
const NOTE_MAX = 500;

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
  /**
   * Optional content this is about, recorded on the report.
   *
   * `contentType`/`contentId` are the pair added in
   * 20261013120000_moderation_actions.sql, and they are what the admin page's
   * "Remove content" action reads: without them a report about a quiz is a
   * report about its author with the quiz described in prose, and there is
   * nothing for an admin to unpublish.
   */
  context?: {
    messageId?: string;
    roomId?: string;
    contentType?: ReportedContentType;
    contentId?: string;
  };
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
  const { user } = useAuth();
  const { reportUser, blockUser } = useContentModeration();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // A new report starts on a blank note; the last one's text must not follow
  // it into the next sheet.
  useEffect(() => {
    if (open) setNote("");
  }, [open, userId, context?.contentId]);

  const close = () => onClose();

  /**
   * Report a piece of content.
   *
   * Not routed through `reportUser`: that helper refuses when the reported id
   * is the caller's own, which is exactly the case for a quiz whose author we
   * could not resolve, and it has nowhere to put content_type/content_id. The
   * row it writes is otherwise the same one, and so are the two toasts.
   */
  const submitContentReport = async (reason: ReportReason, description: string | null) => {
    if (!user) return;
    const contentId = context?.contentId && UUID.test(context.contentId) ? context.contentId : null;
    // An id we cannot store in a uuid column still belongs in the report:
    // without it an admin cannot tell which quiz was flagged.
    const trailer =
      !contentId && context?.contentId ? `[${context.contentType}:${context.contentId}]` : null;

    const { error } = await supabase.from("user_reports").insert({
      reporter_id: user.id,
      reported_user_id: userId || user.id,
      report_type: reason,
      description: [description, trailer].filter(Boolean).join(" ") || null,
      message_id: context?.messageId ?? null,
      room_id: context?.roomId ?? null,
      content_type: context?.contentType ?? null,
      content_id: contentId,
    } as never);

    if (error) {
      console.error("[moderation] Content report failed:", error);
      toast.error(t("moderation.reportFailed"));
      return;
    }
    toast.success(t("moderation.reportReceived"));
  };

  const submitReport = async (reason: ReportReason) => {
    setBusy(true);
    const description = note.trim().slice(0, NOTE_MAX) || null;
    if (context?.contentType) {
      await submitContentReport(reason, description);
    } else {
      await reportUser(userId, reason, description ?? undefined, context);
    }
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

  const sheet = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 safe-screen z-[10000] flex items-end justify-center bg-black/50 sm:items-center"
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

                {/* Every report filed from here carried description: undefined,
                    so `user_reports.description` was null for every single
                    user-filed row and the reporter could never say what had
                    actually happened — a reason alone does not tell an admin
                    which message or which picture. Optional: a tap on a reason
                    still files the report, exactly as before. */}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                  maxLength={NOTE_MAX}
                  rows={3}
                  disabled={busy}
                  placeholder={t("moderation.reportDetailsPlaceholder")}
                  className="mb-3 w-full resize-none rounded-2xl border border-border bg-muted/40 px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
                />

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

  // Portalled to the body, like GameModal.
  //
  // Rendered in place, this sheet is a descendant of a room card, and those
  // cards carry backdrop-blur. A backdrop-filter creates a containing block,
  // so `position: fixed` inside one resolves against the CARD rather than the
  // viewport: the backdrop stops covering the screen, the panel is clipped to
  // a strip, and the room list paints straight through the middle of it. That
  // is exactly what it looked like on device.
  //
  // e2e/overlay-containment.spec.ts exists for this class of bug. It did not
  // catch this one because the sheet only opens behind a tap on a card that
  // renders for a signed-in player.
  return typeof document === "undefined" ? sheet : createPortal(sheet, document.body);
}
