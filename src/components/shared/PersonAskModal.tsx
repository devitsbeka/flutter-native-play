import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Check, UserRound, X } from "lucide-react";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";

/**
 * "Somebody is asking you something" — one card, used by every such moment.
 *
 * A face, their name, a way into their profile, one line saying what they
 * want, and the two answers. It exists because there are two of these — a
 * stranger knocking on a published room, a friend inviting you into theirs —
 * and they were drawn differently: one a bespoke card with an avatar, the
 * other the generic notification popup with an emoji and stacked pills. The
 * same question in two visual languages reads as two different apps.
 *
 * Everything that differs between them is a prop: the words, the answers,
 * and whatever the caller wants to slot in above the buttons (the arena's
 * side picker). Nothing about the layout is.
 *
 * `person` undefined closes it — the caller passes whichever request is at
 * the front of its queue, and nothing when the queue is empty.
 */
export function PersonAskModal({
  motionKey,
  person,
  body,
  profileLabel,
  onOpenProfile,
  children,
  declineLabel,
  onDecline,
  acceptLabel,
  onAccept,
  tertiaryLabel,
  onTertiary,
  footnote,
  closeLabel,
  onClose,
}: {
  /** Stable key for the presence animation. */
  motionKey: string;
  person: { nickname: string; avatar_url: string | null } | undefined;
  /** The one line under the name: what this person is asking for. */
  body: string;
  profileLabel: string;
  onOpenProfile: () => void;
  /** Slotted between the body line and the buttons. */
  children?: ReactNode;
  declineLabel: string;
  onDecline: () => void;
  acceptLabel: string;
  onAccept: () => void;
  /** The small third option under the two answers. Omitted, it is absent. */
  tertiaryLabel?: string;
  onTertiary?: () => void;
  /** "and N more waiting", when there are. */
  footnote?: string;
  /**
   * "Close for now": no answer given. The ask stays exactly where it was —
   * unread, in the notification list — for later. Absent on asks that must
   * be answered on the spot.
   */
  closeLabel?: string;
  onClose?: () => void;
}) {
  return (
    <AnimatePresence>
      {person && (
        <motion.div
          key={motionKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
          style={{
            paddingBottom: "calc(var(--safe-bottom) + 1rem)",
            paddingTop: "calc(var(--safe-top) + 1rem)",
          }}
        >
          <motion.div
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="relative w-full max-w-[380px] rounded-3xl bg-card border border-border shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted/70 text-muted-foreground active:scale-95 transition-transform"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenProfile}
              className="mt-1 w-full flex flex-col items-center gap-2"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary/15">
                <SafeAvatarImage
                  avatarUrl={person.avatar_url}
                  fallback={person.nickname}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
              </div>
              <p className="font-display text-xl text-foreground">{person.nickname}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <UserRound className="w-3.5 h-3.5" />
                {profileLabel}
              </span>
            </button>

            <p className="mt-3 text-center text-sm font-semibold text-foreground">{body}</p>

            {children}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onDecline}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/60 py-3 font-bold text-foreground active:scale-[0.98] transition-transform"
              >
                <X className="w-4 h-4" />
                {declineLabel}
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 font-bold text-primary-foreground shadow-md active:scale-[0.98] transition-transform"
              >
                <Check className="w-4 h-4" />
                {acceptLabel}
              </button>
            </div>

            {/* Blocking is deliberately the small third option, under the
                two real answers rather than beside them: it is the one
                that cannot be taken back from this screen, and a row of
                three equal buttons invites a mis-tap into the permanent
                one. */}
            {tertiaryLabel && onTertiary && (
              <button
                type="button"
                onClick={onTertiary}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-destructive/80 active:scale-[0.98] transition-transform"
              >
                <Ban className="w-3.5 h-3.5" />
                {tertiaryLabel}
              </button>
            )}

            {footnote && (
              <p className="mt-1 text-center text-xs text-muted-foreground">{footnote}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
