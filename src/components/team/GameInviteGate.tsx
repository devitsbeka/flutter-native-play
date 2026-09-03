import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PersonAskModal } from "@/components/shared/PersonAskModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useContentModeration } from "@/hooks/useContentModeration";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { routeForRoom } from "@/utils/roomRoutes";

/**
 * A friend asking you into their room — the same doorstep, the other way round.
 *
 * This used to be the generic notification popup: an emoji, a line of text
 * and two stacked pills. Next to the host's doorstep — a face, a name, a way
 * into the profile, two answers side by side — it read as a different app
 * asking a different kind of question, when it is the same question with the
 * roles swapped. Both are PersonAskModal now; only the words differ.
 *
 * Mounted once, app-wide, beside GlobalJoinRequestGate: an invitation is
 * worth answering wherever you happen to be standing.
 */
export function GlobalGameInviteGate() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { openProfile } = usePlayerProfile();
  const { blockUser } = useContentModeration();
  const { pendingInvitations, loading, acceptInvitation, declineInvitation } = useGameInvitations();

  // Only invitations that arrive while somebody is looking get the card.
  // The ones already waiting when the app opened have been sitting in the
  // notifications list and in the sidebar; throwing a modal over the home
  // screen for those, every launch until they expire, is not an invitation,
  // it is a toll gate.
  const alreadyWaiting = useRef<Set<string> | null>(null);
  if (!loading && alreadyWaiting.current === null) {
    alreadyWaiting.current = new Set(pendingInvitations.map((inv) => inv.id));
  }
  const seen = alreadyWaiting.current;
  const fresh = seen ? pendingInvitations.filter((inv) => !seen.has(inv.id)) : [];
  // Oldest first: the list is newest-first, so the queue is read from the end.
  const next = fresh[fresh.length - 1];

  const accept = async () => {
    if (!next) return;
    const code = await acceptInvitation(next.id);
    if (code) navigate(routeForRoom(next.room, code));
  };

  return (
    <PersonAskModal
      motionKey="invite-gate"
      person={next?.sender}
      onOpenProfile={() => next && openProfile(next.sender_id, { hideTrivias: true })}
      profileLabel={t("extra.joinRequestSeeProfile")}
      body={t("extra.inviteModalBody")}
      declineLabel={t("extra.notifDecline")}
      onDecline={() => next && void declineInvitation(next.id)}
      acceptLabel={t("extra.notifJoin")}
      onAccept={() => void accept()}
      // Declining answers this invitation; blocking ends the inviting.
      tertiaryLabel={t("moderation.block")}
      onTertiary={() => {
        if (!next) return;
        void declineInvitation(next.id);
        void blockUser(next.sender_id);
      }}
      footnote={fresh.length > 1 ? t("extra.joinRequestMore", { count: fresh.length - 1 }) : undefined}
    />
  );
}
