import { AnimatePresence, motion } from "framer-motion";
import { Ban, Check, X, UserRound } from "lucide-react";
import { SafeAvatarImage } from "@/components/shared/SafeAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useRoomJoinRequests } from "@/hooks/useRoomJoinRequests";

/**
 * The door of a published room.
 *
 * Publishing a room lists it for everyone; it does not open it. When
 * somebody asks, this is what the host sees — over whatever they were doing
 * in the lobby, because the person asking is waiting on the answer and a
 * badge somewhere is not an answer.
 *
 * The host gets three things and no more: who it is, a way into their
 * profile (their record and what they have won — not their quizzes, which
 * would be a shop window in the middle of a yes/no), and the two buttons.
 * One request at a time, oldest first: two strangers at once is two
 * decisions, not one.
 *
 * Mounted by every lobby that can host a published room. It renders nothing
 * at all for a guest, for a private room, and for a host with an empty
 * doorstep.
 */
export function JoinRequestGate({
  roomId,
  isHost,
}: {
  roomId: string | null | undefined;
  isHost: boolean;
}) {
  const { t } = useLanguage();
  const { openProfile } = usePlayerProfile();
  const { pending, respond, block } = useRoomJoinRequests(roomId, isHost);

  const next = pending[0];

  return (
    <AnimatePresence>
      {next && (
        <motion.div
          key="join-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
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
            className="w-full max-w-[380px] rounded-3xl bg-card border border-border shadow-2xl p-5"
          >
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("extra.joinRequestTitle")}
            </p>

            <button
              type="button"
              onClick={() => openProfile(next.user_id, { hideTrivias: true })}
              className="mt-4 w-full flex flex-col items-center gap-2"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary/15">
                <SafeAvatarImage
                  avatarUrl={next.avatar_url}
                  fallback={next.nickname}
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
              </div>
              <p className="font-display text-xl text-foreground">{next.nickname}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <UserRound className="w-3.5 h-3.5" />
                {t("extra.joinRequestSeeProfile")}
              </span>
            </button>

            <p className="mt-3 text-center text-sm text-muted-foreground">
              {t("extra.joinRequestBody")}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => void respond(next.id, false)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/60 py-3 font-bold text-foreground active:scale-[0.98] transition-transform"
              >
                <X className="w-4 h-4" />
                {t("extra.joinRequestDecline")}
              </button>
              <button
                type="button"
                onClick={() => void respond(next.id, true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 font-bold text-primary-foreground shadow-md active:scale-[0.98] transition-transform"
              >
                <Check className="w-4 h-4" />
                {t("extra.joinRequestAccept")}
              </button>
            </div>

            {/* Blocking is deliberately the small third option, under the
                two real answers rather than beside them: it is the one
                that cannot be taken back from this screen, and a row of
                three equal buttons invites a mis-tap into the permanent
                one. Declining answers this knock; blocking ends the
                knocking — the room leaves their Public tab altogether. */}
            <button
              type="button"
              onClick={() => void block(next.id)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-destructive/80 active:scale-[0.98] transition-transform"
            >
              <Ban className="w-3.5 h-3.5" />
              {t("extra.joinRequestBlock")}
            </button>

            {pending.length > 1 && (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {t("extra.joinRequestMore", { count: pending.length - 1 })}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
