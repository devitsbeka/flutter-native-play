import { memo, useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useMotionValue, useTransform, useAnimationControls, PanInfo } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Play, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ResolvedAvatarImage } from '@/components/ui/resolved-avatar-image';
import { QuizCategoryIcon } from '@/components/ui/quiz-category-icon';
import { getNotificationConfig } from '@/config/notificationConfig';
import { useLanguage } from '@/contexts/LanguageContext';

// 3D icon mapping for trivia notification types
import { Notification } from '@/hooks/useNotifications';
import { NotificationIcon } from '@/components/notifications/NotificationIcon';
import { shouldDismissSwipe, SWIPE_THRESHOLD, SWIPE_LIMIT } from '@/utils/swipeToDismiss';
import { translateNotificationTitle, translateNotificationMessage } from '@/utils/notificationTranslations';
import { useLocalizedCategoryName } from "@/utils/categoryDisplayName";
import iconKingLounge from "@/assets/play-chooser/icon-king.webp";
import iconBattleLounge from "@/assets/play-chooser/icon-crate.png";
import iconWordsLounge from "@/assets/play-chooser/icon-words.webp";
import { roomKind } from "@/utils/roomRoutes";
import { RoomCardPlayButton } from "@/components/team/RoomCardPlayButton";
import { useRoomIconPool } from "@/hooks/useRoomIconPool";
import { dealtRoomIcon } from "@/utils/roomCrests";

// The two lounges wear their own face on an invite — the King mascot, the
// Battle crate — and name their game where an ordinary room names its
// category. Same branding the rooms list uses (MyRoomsSection).
const LOUNGE_META: Record<string, { icon: string; labelKey: string }> = {
  king: { icon: iconKingLounge, labelKey: "lobby.vkTitle" },
  team_battle: { icon: iconBattleLounge, labelKey: "teamBattle.title" },
  words: { icon: iconWordsLounge, labelKey: "words.title" },
};

interface CompactNotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onNavigate: (notification: Notification) => void;
  onAcceptFriend?: (friendshipId: string, notificationId: string) => void;
  onDeclineFriend?: (friendshipId: string, notificationId: string) => void;
  onAcceptInvite?: (invitationId: string, notificationId: string) => void;
  onDeclineInvite?: (invitationId: string, notificationId: string) => void;
  /** Somebody asking into a room you host: let them in, or not. */
  onAcceptJoin?: (roomId: string, requesterId: string, notificationId: string) => void;
  onDeclineJoin?: (roomId: string, requesterId: string, notificationId: string) => void;
  /** A rematch asked of you: play it, or give up your seat. */
  onAcceptRematch?: (notification: Notification) => void;
  onDeclineRematch?: (notification: Notification) => void;
  onDismiss?: (id: string) => void;
  actionLoading?: string | null;
  timeAgo: string;
}



export const CompactNotificationCard = memo(function CompactNotificationCard({
  notification,
  onMarkRead,
  onNavigate,
  onAcceptFriend,
  onDeclineFriend,
  onAcceptInvite,
  onDeclineInvite,
  onAcceptJoin,
  onDeclineJoin,
  onAcceptRematch,
  onDeclineRematch,
  onDismiss,
  actionLoading,
  timeAgo,
}: CompactNotificationCardProps) {
  const { t } = useLanguage();
  const localizeCategory = useLocalizedCategoryName();
  const [isDismissing, setIsDismissing] = useState(false);
  const touchedRef = useRef(false);
  const x = useMotionValue(0);
  const controls = useAnimationControls();
  // Both track the card's own position, so the bin appears exactly as far as
  // the card has actually moved.
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-SWIPE_THRESHOLD, -30, 0], [1, 0.8, 0.5]);

  const isUnread = !notification.read_at;
  const config = getNotificationConfig(notification.type);
  const Icon = config.icon;

  const isFriendRequest = notification.type === 'friend_request';
  const isGameInvite = notification.type === 'challenge';
  const isRoomInvite = notification.type === 'room_invite';
  // A knock on a room you host. The same yes/no the lobby's doorstep
  // asks, here for a host who was not looking at the lobby.
  const isJoinRequest = notification.type === 'room_join_request';
  // A rematch asked — by the host starting over, or a player with a pick of
  // their own. Yes goes to the room; no gives up the seat.
  const isRematch = notification.type === 'rematch_request';
  // The host's answer to an ask — tapping it enters the room (approved) or
  // just reads (declined).
  const isJoinAnswer =
    notification.type === 'room_join_approved' || notification.type === 'room_join_declined';
  const isGameStarted = notification.type === 'game_started';
  const isGameResult = notification.type === 'game_result';
  const isTriviaLikedOrSaved = ['trivia_liked', 'trivia_saved'].includes(notification.type);
  const isTriviaPlayed = notification.type === 'trivia_played';

  const actionTaken = notification.data?.action_taken as 'accepted' | 'declined' | undefined;
  const hasActionTaken = !!actionTaken;

  const hasDualActions = (isFriendRequest || isGameInvite || isJoinRequest || isRematch) && !hasActionTaken;
  const hasSingleAction = (isRoomInvite || isGameStarted || isGameResult || isTriviaLikedOrSaved) && !hasDualActions;

  const isLoading = actionLoading === notification.id;

  // Which of THIS card's two buttons was pressed.
  //
  // The parent tracks the notification being acted on, not the action, so a
  // friend request answered with Accept spun both buttons: one isLoading drove
  // both spinners, and it read as though the app were doing two things at once.
  // The card is the only place that knows which button was hit, so it holds
  // that here rather than every caller threading it down.
  const [pressedAction, setPressedAction] = useState<"accept" | "decline" | null>(null);

  // Clear when the work finishes, so the next press starts from nothing.
  useEffect(() => {
    if (!isLoading) setPressedAction(null);
  }, [isLoading]);

  const avatarUrl = (notification.data?.sender_avatar || notification.data?.sender_avatar_url) as string | undefined;
  const senderName = notification.data?.sender_nickname as string || notification.data?.sender_name as string || '';
  const storedRoomName = notification.data?.room_name as string | undefined;
  const storedCategoryName = notification.data?.category_name as string | undefined;
  const storedRoomIcon = notification.data?.room_icon as string | undefined;
  const roomId = notification.data?.room_id as string | undefined;
  const isRoomPing = notification.type === 'room_ping';

  // The invite's payload is a snapshot taken by the notify_room_invite
  // trigger when the invite was sent. The host can pick a different category
  // afterwards — from the lobby, or by queueing rounds, which clears the
  // room's selection outright — and the invited player would still be
  // reading the category from the moment they were invited, then land in a
  // different one. Read the room itself so the card shows what is actually
  // going to be played; the payload stays as the fallback for rooms that
  // have since been deleted.
  const { data: liveRoom } = useQuery({
    queryKey: ['notification-room', roomId],
    queryFn: async () => {
      const { data } = await supabase
        .from('game_rooms')
        .select('room_icon, room_name, category_name, game_type_key, game_mode')
        .eq('id', roomId!)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!roomId,
    staleTime: 30_000,
    gcTime: 60 * 60 * 1000,
  });
  const lounge = liveRoom ? LOUNGE_META[roomKind(liveRoom)] : undefined;
  // The room's face: its own icon, else the one every card deals it from
  // the shared pool by room id — so a room with no icon of its own wears
  // the same face here as on the rooms list, rather than a line-art house
  // (owner: "show per notification more largely to fit room icons ... now
  // it shows some mini lined icons we don't need them").
  const roomIconPool = useRoomIconPool();
  const roomIcon =
    (lounge ? lounge.icon : undefined)
    || liveRoom?.room_icon
    || storedRoomIcon
    || (roomId ? dealtRoomIcon(roomId, roomIconPool) : null)
    || undefined;
  const roomName = liveRoom?.room_name || storedRoomName || undefined;
  // A rematch card says the category the ASKER wants, which is not the
  // room's until the host says yes — so the stored pick, never the live row.
  const categoryName = localizeCategory(
    isRematch ? storedCategoryName : liveRoom ? liveRoom.category_name ?? undefined : storedCategoryName,
  );
  const triviaCover = notification.data?.trivia_cover as string | undefined;
  const triviaIconSlug = notification.data?.trivia_icon_slug as string | undefined;
  
  const hasRoomContext = isRoomInvite || isGameStarted || isGameInvite || isJoinRequest || isJoinAnswer || isRematch;

  // Determine avatar content based on notification type
  const avatarContent = useMemo(() => {
    if (isTriviaLikedOrSaved || isTriviaPlayed) {
      if (triviaCover) {
        return { type: 'image' as const, src: triviaCover };
      }
      if (triviaIconSlug) {
        return { type: 'icon_slug' as const, slug: triviaIconSlug };
      }
    }
    
    // A room notification leads with the PERSON — who started, who asked,
    // who answered — and the room wears its own face in the chip below,
    // at a size that reads. The room's face takes this slot only when
    // nobody sent it.
    if (isRoomInvite || isGameStarted || isGameInvite || isRoomPing || isJoinAnswer || isRematch) {
      if (roomIcon && !senderName && !avatarUrl) {
        return { type: 'image' as const, src: roomIcon };
      }
    }

    return { type: 'avatar' as const, src: avatarUrl };
  }, [notification.type, triviaCover, triviaIconSlug, roomIcon, avatarUrl, senderName, isTriviaLikedOrSaved, isTriviaPlayed, isRoomInvite, isGameStarted, isGameInvite, isRoomPing, isJoinAnswer, isRematch]);
  
  // Build subtitle based on notification type
  const getSubtitle = () => {
    if (isRoomInvite || isGameInvite) {
      return senderName ? t("extra.notifInvitesYou", { name: senderName }) : t("extra.notifInviteGeneric");
    }
    if (isGameStarted) {
      return senderName ? t("extra.notifStartedGame", { name: senderName }) : t("extra.notifGameStarted");
    }
    if (isFriendRequest && senderName) {
      return t("extra.notifFriendReq", { name: senderName });
    }
    // The title is the asker's name; this says what they want. The room
    // (and which game it is) follows in the context chip.
    if (isJoinRequest) return t("extra.joinRequestBody");
    // Who is asking, and whether they are starting over or asking to.
    if (isRematch) {
      const name = senderName || t("extra.someoneLabel");
      return notification.data?.kind === 'host_new_game'
        ? t("extra.rematchNewGameBody", { name })
        : t("extra.rematchRequestBody", { name });
    }
    // The answer to your ask: the title says which way it went, this says
    // what to do about it. (The stored title/message is a bare room code.)
    if (notification.type === 'room_join_approved') return t("extra.joinApprovedBody");
    if (notification.type === 'room_join_declined') return t("extra.joinDeclinedBody");
    return null;
  };
  
  const subtitle = getSubtitle();

  // Nothing more specific to show — no sender, no room art, no trivia cover —
  // so the notification's own icon takes the main slot and the corner badge
  // stands down.
  const showsOwnIcon =
    avatarContent.type !== 'icon_slug' &&
    !(avatarContent.type === 'image' && avatarContent.src) &&
    !senderName &&
    !avatarUrl;

  // Prevent double-firing from both touch and click on mobile
  const handleAcceptClick = (e: React.MouseEvent) => {
    if (touchedRef.current) {
      touchedRef.current = false;
      return; // Skip click after touch
    }
    handleAcceptAction(e);
  };
  
  const handleAcceptTouch = (e: React.TouchEvent) => {
    touchedRef.current = true;
    handleAcceptAction(e);
  };
  
  const handleAcceptAction = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isLoading) return;
    setPressedAction("accept");
    
    console.log("[NotificationCard] handleAccept called", {
      type: notification.type,
      data: notification.data,
      isFriendRequest,
      isGameInvite,
      friendship_id: notification.data?.friendship_id,
      invitation_id: notification.data?.invitation_id,
    });
    
    if (isFriendRequest) {
      const friendshipId = notification.data?.friendship_id as string;
      if (!friendshipId) {
        console.error("[NotificationCard] Missing friendship_id in notification data");
        return;
      }
      onAcceptFriend?.(friendshipId, notification.id);
    } else if (isGameInvite) {
      const invitationId = notification.data?.invitation_id as string;
      if (!invitationId) {
        console.error("[NotificationCard] Missing invitation_id in notification data");
        return;
      }
      onAcceptInvite?.(invitationId, notification.id);
    } else if (isJoinRequest) {
      const roomId = notification.data?.room_id as string | undefined;
      const requesterId = notification.data?.requester_id as string | undefined;
      if (!roomId || !requesterId) {
        console.error("[NotificationCard] Missing room_id/requester_id in notification data");
        return;
      }
      onAcceptJoin?.(roomId, requesterId, notification.id);
    } else if (isRematch) {
      onAcceptRematch?.(notification);
    }
  };

  const handleDeclineClick = (e: React.MouseEvent) => {
    if (touchedRef.current) {
      touchedRef.current = false;
      return;
    }
    handleDeclineAction(e);
  };
  
  const handleDeclineTouch = (e: React.TouchEvent) => {
    touchedRef.current = true;
    handleDeclineAction(e);
  };
  
  const handleDeclineAction = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isLoading) return;
    setPressedAction("decline");
    
    console.log("[NotificationCard] handleDecline called", {
      type: notification.type,
      data: notification.data,
    });
    
    if (isFriendRequest) {
      const friendshipId = notification.data?.friendship_id as string;
      if (!friendshipId) {
        console.error("[NotificationCard] Missing friendship_id in notification data");
        return;
      }
      onDeclineFriend?.(friendshipId, notification.id);
    } else if (isGameInvite) {
      const invitationId = notification.data?.invitation_id as string;
      if (!invitationId) {
        console.error("[NotificationCard] Missing invitation_id in notification data");
        return;
      }
      onDeclineInvite?.(invitationId, notification.id);
    } else if (isJoinRequest) {
      const roomId = notification.data?.room_id as string | undefined;
      const requesterId = notification.data?.requester_id as string | undefined;
      if (!roomId || !requesterId) {
        console.error("[NotificationCard] Missing room_id/requester_id in notification data");
        return;
      }
      onDeclineJoin?.(roomId, requesterId, notification.id);
    } else if (isRematch) {
      onDeclineRematch?.(notification);
    }
  };

  const handleSingleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnread) onMarkRead(notification.id);
    onNavigate(notification);
  };

  const getActionButtonLabel = () => {
    if (isRoomInvite || isGameStarted || isTriviaPlayed) return t("extra.notifPlay");
    if (isGameResult || isTriviaLikedOrSaved) return t("extra.notifView");
    return t("extra.notifOpen");
  };

  const isPlayButton = isRoomInvite || isGameStarted || isTriviaPlayed;

  const handleClick = () => {
    // Allow card click for all notifications except those with dual actions (accept/decline)
    if (!hasDualActions) {
      if (isUnread) onMarkRead(notification.id);
      onNavigate(notification);
    }
  };

  const handleDragEnd = async (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const committed = shouldDismissSwipe(info.offset.x, info.velocity.x);

    if (!committed || !onDismiss) {
      // Not far enough: ride back to rest instead of snapping
      void controls.start({ x: 0, transition: { type: "spring", stiffness: 500, damping: 40 } });
      return;
    }

    // Carry the swipe through — the card leaves the way the finger was
    // taking it, then the row collapses behind it
    await controls.start({
      x: -window.innerWidth,
      transition: { duration: 0.18, ease: "easeOut" },
    });
    setIsDismissing(true);
    onDismiss(notification.id);
  };

  if (isDismissing) {
    return (
      <motion.div
        initial={{ height: 'auto', opacity: 1 }}
        animate={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      />
    );
  }

  return (
    <motion.div
      className="relative overflow-hidden mx-2 my-2 rounded-2xl"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Delete background indicator */}
      <motion.div 
        className="absolute inset-0 bg-destructive flex items-center justify-end pr-6"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 className="w-5 h-5 text-destructive-foreground" />
        </motion.div>
      </motion.div>

      {/* Swipeable card. The constraints used to pin both edges to 0 with
          dragElastic 0.1, so the card crawled a tenth of the way while the
          delete fired off the finger's travel — it barely moved, then the row
          vanished. Left is free to SWIPE_LIMIT so the card tracks the finger
          1:1; right stays pinned. */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -SWIPE_LIMIT, right: 0 }}
        dragElastic={{ left: 0.35, right: 0 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={controls}
        className={cn(
          "relative flex items-start gap-3.5 px-4 py-4 transition-colors backdrop-blur-sm border border-border/40 rounded-[24px]",
          isUnread ? "bg-purple-500/10" : "bg-card/80",
          !hasDualActions && "cursor-pointer active:bg-foreground/5"
        )}
        onClick={handleClick}
      >
        {/* Avatar with type indicator badge */}
        <div className="relative flex-shrink-0">
          {avatarContent.type === 'icon_slug' ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
              <QuizCategoryIcon 
                iconSlug={avatarContent.slug} 
                size={40} 
              />
            </div>
          ) : avatarContent.type === 'image' && avatarContent.src ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted">
              <img 
                src={avatarContent.src} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : senderName || avatarUrl ? (
            <Avatar className="w-12 h-12">
              <ResolvedAvatarImage src={avatarUrl} />
              <AvatarFallback 
                className="text-sm font-bold text-primary-foreground"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270, 70%, 50%) 100%)"
                }}
              >
                {senderName ? senderName.charAt(0).toUpperCase() : <Icon className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
          ) : (
            /* Nobody sent it — a reward, a level, a system note — so the
               notification's own artwork takes the slot instead of an
               initial-less avatar. */
            <NotificationIcon type={notification.type} size={48} />
          )}
          
          {/* The type badge, on the corner of whatever the slot is showing.
              Dropped when the slot is already this very icon at full size. */}
          {!showsOwnIcon && (
            <NotificationIcon
              type={notification.type}
              size={22}
              radius={11}
              className="absolute -bottom-1 -right-1"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] leading-5">
                    <span
                      className={cn(
                        "font-bold",
                        isUnread ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {translateNotificationTitle(
                        notification.type,
                        notification.title,
                        notification.data as Record<string, unknown>
                      )}
                    </span>
                  </p>
                  {subtitle && (
                    <p className="text-[13px] text-muted-foreground/70 mt-0.5">
                      {subtitle}
                    </p>
                  )}
                  {!subtitle && notification.message && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {translateNotificationMessage(
                        notification.type,
                        notification.message,
                        notification.data as Record<string, unknown>
                      )}
                    </p>
                  )}
                  
                  {/* The room, as a card wears it: its face at a size that
                      reads, its name, and which GAME it is for — the lounge's
                      brand name, or an ordinary room's category — as words
                      alone. The line-art house and tag that used to stand in
                      for those are gone (owner: "show category - as just
                      text - category title - no icon needed"). */}
                  {hasRoomContext && (roomName || categoryName || lounge) && (
                    <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-border/30 bg-muted/50 p-2.5">
                      {roomIcon && (
                        <img
                          src={roomIcon}
                          alt=""
                          draggable={false}
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {roomName && (
                          <p className="truncate text-[15px] font-semibold leading-5 text-foreground">{roomName}</p>
                        )}
                        {(lounge || categoryName) && (
                          <p className="truncate text-[13px] leading-[18px] text-muted-foreground">
                            {lounge ? t(lounge.labelKey) : categoryName}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/60 whitespace-nowrap pt-0.5">
                  {timeAgo}
                </span>
              </div>
            </div>

            {isUnread && (
              <div className="flex-shrink-0 mt-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
            )}
          </div>

          {/* The buttons are the room cards' own (RoomCardPlayButton): yes
              in the mint every button one tap from a game wears, no as the
              unfilled pill beside it — the pair the preview and rematch
              sheets use (owner: "use same play button what we use on
              cards"). */}
          {hasDualActions && (
            <div className="mt-3 flex items-center gap-2">
              <RoomCardPlayButton
                tone="mint"
                onClick={handleAcceptClick}
                onTouchEnd={handleAcceptTouch}
                disabled={isLoading}
                className="min-h-[40px] px-5"
                style={{ touchAction: 'manipulation' }}
              >
                {isLoading && pressedAction === "accept" ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    {isFriendRequest || isJoinRequest || isRematch ? t("extra.notifAccept") : t("extra.notifJoin")}
                  </>
                )}
              </RoomCardPlayButton>
              <RoomCardPlayButton
                tone="outline"
                onClick={handleDeclineClick}
                onTouchEnd={handleDeclineTouch}
                disabled={isLoading}
                className="min-h-[40px] px-5"
                style={{ touchAction: 'manipulation' }}
              >
                {isLoading && pressedAction === "decline" ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </span>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" strokeWidth={3} />
                    {t("extra.notifDecline")}
                  </>
                )}
              </RoomCardPlayButton>
            </div>
          )}

          {hasActionTaken && (isFriendRequest || isJoinRequest || isRematch) && (
            <div className={cn(
              "mt-3 px-4 py-2 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5",
              actionTaken === 'accepted' 
                ? "bg-emerald-500/20 text-emerald-600" 
                : "bg-muted text-muted-foreground"
            )}>
              {actionTaken === 'accepted' ? (
                <>
                  <span className="text-base">✓</span>
                  <span>{t("extra.notifAccepted")}</span>
                </>
              ) : (
                <>
                  <span className="text-base">✗</span>
                  <span>{t("extra.notifDeclined")}</span>
                </>
              )}
            </div>
          )}

          {hasSingleAction && (
            <RoomCardPlayButton
              tone={isPlayButton ? "mint" : "outline"}
              onClick={handleSingleAction}
              className="mt-3 min-h-[40px] px-5"
            >
              {isPlayButton && <Play className="w-3.5 h-3.5 fill-current" />}
              {getActionButtonLabel()}
            </RoomCardPlayButton>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});
