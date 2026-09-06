import { useRef, useState } from "react";
import { PersonAskModal } from "@/components/shared/PersonAskModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { useContentModeration } from "@/hooks/useContentModeration";
import { useFriends } from "@/hooks/useFriends";
import { useNotifications } from "@/hooks/useNotifications";
import { markNotificationActioned } from "@/utils/notificationActions";

/**
 * Somebody asking to be your friend — the doorstep card, one more time.
 *
 * A friend request used to land as a row in the notification list and
 * nothing else; whoever asked waited until you happened to open the bell.
 * Now the ask that arrives while you are in the app is put in front of you
 * (owner's ask): a face, a name, the way into their profile, and one tap to
 * accept, decline, or block. And one to close it for now — no answer given,
 * and the notification stays exactly as it was, unread in the list, so the
 * bell still shows it as new and the card there still offers the same two
 * answers.
 *
 * Driven off the notifications the context already streams, not a second
 * subscription. Like the invite gate, only asks that ARRIVE while somebody
 * is looking get the card: the ones waiting when the app opened have been
 * in the list all along, and a modal for each of them on every launch is a
 * toll gate, not an invitation.
 */
export function GlobalFriendRequestGate() {
  const { t } = useLanguage();
  const { openProfile } = usePlayerProfile();
  const { blockUser } = useContentModeration();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { notifications, loading } = useNotifications();

  const asks = notifications.filter(
    (n) => n.type === "friend_request" && !n.read_at && !(n.data as { action_taken?: string } | null)?.action_taken,
  );
  const alreadyWaiting = useRef<Set<string> | null>(null);
  if (!loading && alreadyWaiting.current === null) {
    alreadyWaiting.current = new Set(asks.map((n) => n.id));
  }
  // Closed for now, or answered: off the screen for this visit either way.
  const [settled, setSettled] = useState<Set<string>>(() => new Set());
  const seen = alreadyWaiting.current;
  const fresh = seen ? asks.filter((n) => !seen.has(n.id) && !settled.has(n.id)) : [];
  // Oldest first: the list is newest-first, so the queue is read from the end.
  const next = fresh[fresh.length - 1];
  const data = (next?.data ?? {}) as {
    friendship_id?: string;
    sender_id?: string;
    sender_nickname?: string | null;
    sender_avatar?: string | null;
  };
  const person = next
    ? { nickname: data.sender_nickname || t("notifications.friendRequest"), avatar_url: data.sender_avatar ?? null }
    : undefined;

  const settle = (id: string) => setSettled((prev) => new Set(prev).add(id));

  const accept = async () => {
    if (!next) return;
    settle(next.id);
    const ok = data.friendship_id ? await acceptFriendRequest(data.friendship_id) : false;
    // A request withdrawn before it was answered has nothing to accept:
    // read, with no outcome, rather than a card that says "accepted".
    await markNotificationActioned(next.id, ok ? "accepted" : null);
  };

  const decline = async () => {
    if (!next) return;
    settle(next.id);
    if (data.friendship_id) await declineFriendRequest(data.friendship_id);
    await markNotificationActioned(next.id, "declined");
  };

  // Declining answers this ask; blocking ends the asking.
  const block = async () => {
    if (!next) return;
    settle(next.id);
    if (data.friendship_id) await declineFriendRequest(data.friendship_id);
    if (data.sender_id) await blockUser(data.sender_id);
    await markNotificationActioned(next.id, "declined");
  };

  // No answer, no write: the notification is left unread for the list.
  const closeForNow = () => {
    if (next) settle(next.id);
  };

  return (
    <PersonAskModal
      motionKey="friend-ask-gate"
      person={person}
      onOpenProfile={() => data.sender_id && openProfile(data.sender_id, { hideTrivias: true })}
      profileLabel={t("extra.joinRequestSeeProfile")}
      body={t("extra.friendAskBody")}
      declineLabel={t("notifications.decline")}
      onDecline={() => void decline()}
      acceptLabel={t("notifications.accept")}
      onAccept={() => void accept()}
      tertiaryLabel={t("moderation.block")}
      onTertiary={() => void block()}
      closeLabel={t("extra.friendAskLater")}
      onClose={closeForNow}
      footnote={fresh.length > 1 ? t("extra.joinRequestMore", { count: fresh.length - 1 }) : undefined}
    />
  );
}
