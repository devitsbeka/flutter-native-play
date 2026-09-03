import { useEffect, useRef, useState } from "react";
import { MoreVertical, Flag, Ban, UserMinus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { ReportBlockSheet } from "@/components/social/ReportBlockSheet";
import { cn } from "@/lib/utils";

/**
 * One row, one style — see the note on the component.
 *
 * Sized to be tapped, not to be read: a 56px row is the height a thumb can
 * land on without aiming, and each one is its own rounded target inside the
 * menu's padding rather than a full-bleed strip butted against its neighbours,
 * so a near miss lands on a row instead of between two. The icon sits in the
 * same rounded tile the rest of the app puts icons in, which is what gives the
 * row its weight — the previous version was a 14px glyph and 13px of padding,
 * and it read as a web menu dropped into a game.
 */
const ROW =
  "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left text-[15px] font-semibold " +
  "text-foreground min-h-[56px] transition-transform active:scale-[0.98] hover:bg-muted/70";
const ROW_TILE = "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-muted";
const ROW_ICON = "h-5 w-5 text-foreground/70";

interface PlayerOverflowMenuProps {
  /** The author of the content this menu hangs off. */
  userId: string;
  displayName?: string;
  className?: string;
  /** Restyle the dots button (e.g. the profile header's 40px round chip). */
  triggerClassName?: string;
  /** When set, the menu also offers "remove friend" — one dropdown instead
   *  of two dot buttons side by side on a friend's profile. */
  onRemoveFriend?: () => void;
}

/**
 * The three dots on someone else's content: report, block, remove.
 *
 * The rows are one style, not three. Block and Remove were `text-destructive`
 * on a `destructive/10` hover and Report carried an amber flag, so a menu of
 * three items was drawn in three colours — two of them shouting. None of these
 * is destructive in the sense that word is reserved for: nothing is deleted,
 * and every one of them opens a sheet that asks again. They read as ordinary
 * menu items now, at a size a thumb can actually land on, and the icons are
 * the same weight and tone as each other.
 *
 * There is no Cancel row. The menu already closes on a tap anywhere outside
 * it (see the pointerdown effect below), which is how every other menu on the
 * platform is dismissed; a row that only undoes opening the menu spent a
 * quarter of it saying nothing.
 *
 * One component because two cards need it — the flat feed card on a phone and
 * the creator card on tablet and desktop — and only the phone one had it, so
 * a guideline 1.2 affordance simply did not exist above 768px.
 *
 * Renders nothing on your own content, and nothing for a signed-out reader,
 * who has no account to report from.
 */
export function PlayerOverflowMenu({
  userId,
  displayName,
  className,
  triggerClassName,
  onRemoveFriend,
}: PlayerOverflowMenuProps) {
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
        className={cn(
          "p-2 rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition",
          triggerClassName,
        )}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-50 mt-2 w-[248px] space-y-0.5 overflow-hidden rounded-[22px] border border-border/60 bg-popover p-1.5 shadow-xl"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setView("reasons");
            }}
            className={ROW}
          >
            <span className={ROW_TILE}><Flag className={ROW_ICON} /></span>
            {t("moderation.report")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setView("confirmBlock");
            }}
            className={ROW}
          >
            <span className={ROW_TILE}><Ban className={ROW_ICON} /></span>
            {t("moderation.block")}
          </button>
          {onRemoveFriend && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRemoveFriend();
              }}
              className={ROW}
            >
              <span className={ROW_TILE}><UserMinus className={ROW_ICON} /></span>
              {t("extra.removeMenuItem")}
            </button>
          )}
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
