import { useEffect, useRef, useState } from "react";
import { MoreVertical, Flag, Ban } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { ReportBlockSheet } from "@/components/social/ReportBlockSheet";
import { cn } from "@/lib/utils";

interface PlayerOverflowMenuProps {
  /** The author of the content this menu hangs off. */
  userId: string;
  displayName?: string;
  className?: string;
}

/**
 * The three dots on someone else's content: report, block, cancel.
 *
 * One component because two cards need it — the flat feed card on a phone and
 * the creator card on tablet and desktop — and only the phone one had it, so
 * a guideline 1.2 affordance simply did not exist above 768px.
 *
 * Renders nothing on your own content, and nothing for a signed-out reader,
 * who has no account to report from.
 */
export function PlayerOverflowMenu({ userId, displayName, className }: PlayerOverflowMenuProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"reasons" | "confirmBlock" | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on a tap outside the button *and* the menu.
  //
  // Scoped to the whole wrapper rather than the menu alone: with only the
  // menu, a tap on the button closed here and then re-opened in the button's
  // own onClick, so the dots could not be used to dismiss what they opened.
  //
  // A `fixed inset-0 safe-screen` catcher instead of a listener does not work here — the
  // feed card sets content-visibility: auto, and paint containment makes that
  // card the containing block for fixed descendants, so the overlay would
  // cover its own card and nothing else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  if (!user || user.id === userId) return null;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={t("moderation.report")}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1.5 rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setView("reasons");
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted"
          >
            <Flag className="h-4 w-4 shrink-0 text-amber-500" />
            {t("moderation.report")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setView("confirmBlock");
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Ban className="h-4 w-4 shrink-0" />
            {t("moderation.block")}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full border-t border-border/60 px-3.5 py-2.5 text-center text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            {t("common.cancel")}
          </button>
        </div>
      )}

      <ReportBlockSheet
        open={view !== null}
        view={view ?? "reasons"}
        onClose={() => setView(null)}
        userId={userId}
        displayName={displayName}
      />
    </div>
  );
}
