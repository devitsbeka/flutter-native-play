import { memo, useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useMotionValue, useTransform, useAnimationControls, PanInfo } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Home, Tag } from 'lucide-react';
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

interface CompactNotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onNavigate: (notification: Notification) => void;
  onAcceptFriend?: (friendshipId: string, notificationId: string) => void;
  onDeclineFriend?: (friendshipId: string, notificationId: string) => void;
  onAcceptInvite?: (invitationId: string, notificationId: string) => void;
  onDeclineInvite?: (invitationId: string, notificationId: string) => void;
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
  const isGameStarted = notification.type === 'game_started';
  const isGameResult = notification.type === 'game_result';
  const isTriviaLikedOrSaved = ['trivia_liked', 'trivia_saved'].includes(notification.type);
  const isTriviaPlayed = notification.type === 'trivia_played';

  const actionTaken = notification.data?.action_taken as 'accepted' | 'declined' | undefined;
  const hasActionTaken = !!actionTaken;

  const hasDualActions = (isFriendRequest || isGameInvite) && !hasActionTaken;
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
        .select('room_icon, room_name, category_name')
        .eq('id', roomId!)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!roomId,
    staleTime: 30_000,
    gcTime: 60 * 60 * 1000,
  });
  const roomIcon = liveRoom?.room_icon || storedRoomIcon || undefined;
  const roomName = liveRoom?.room_name || storedRoomName || undefined;
  const categoryName = localizeCategory(liveRoom ? liveRoom.category_name ?? undefined : storedCategoryName);
  const triviaCover = notification.data?.trivia_cover as string | undefined;
  const triviaIconSlug = notification.data?.trivia_icon_slug as string | undefined;
  
  const hasRoomContext = isRoomInvite || isGameStarted || isGameInvite;

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
    
    if (isRoomInvite || isGameStarted || isGameInvite || isRoomPing) {
      if (roomIcon) {
        return { type: 'image' as const, src: roomIcon };
      }
    }

    return { type: 'avatar' as const, src: avatarUrl };
  }, [notification.type, triviaCover, triviaIconSlug, roomIcon, avatarUrl, isTriviaLikedOrSaved, isTriviaPlayed, isRoomInvite, isGameStarted, isGameInvite]);
  
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
          "relative flex items-start gap-3 px-4 py-3 transition-colors backdrop-blur-sm border border-border/40 rounded-2xl",
          isUnread ? "bg-purple-500/10" : "bg-card/80",
          !hasDualActions && "cursor-pointer active:bg-foreground/5"
        )}
        onClick={handleClick}
      >
        {/* Avatar with type indicator badge */}
        <div className="relative flex-shrink-0">
          {avatarContent.type === 'icon_slug' ? (
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
              <QuizCategoryIcon 
                iconSlug={avatarContent.slug} 
                size={36} 
              />
            </div>
          ) : avatarContent.type === 'image' && avatarContent.src ? (
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted">
              <img 
                src={avatarContent.src} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : senderName || avatarUrl ? (
            <Avatar className="w-11 h-11">
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
            <NotificationIcon type={notification.type} size={44} />
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
                  <p className="text-sm">
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
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
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
                  
                  {hasRoomContext && (roomName || categoryName) && (
                    <div className="mt-2 p-2.5 rounded-xl bg-muted/50 border border-border/30 space-y-1.5">
                      {roomName && (
                        <div className="flex items-center gap-2 text-xs">
                          <Home className="w-3.5 h-3.5 text-primary/70" />
                          <span className="font-medium text-foreground">{roomName}</span>
                        </div>
                      )}
                      {categoryName && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Tag className="w-3.5 h-3.5" />
                          <span>{categoryName}</span>
                        </div>
                      )}
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

          {hasDualActions && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleAcceptClick}
                onTouchEnd={handleAcceptTouch}
                disabled={isLoading}
                className="px-4 py-2 min-h-[40px] rounded-full border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 transition-colors text-xs font-semibold disabled:opacity-50 active:scale-95"
                style={{ touchAction: 'manipulation' }}
              >
                {isLoading && pressedAction === "accept" ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </span>
                ) : isFriendRequest ? t("extra.notifAccept") : t("extra.notifJoin")}
              </button>
              <button
                type="button"
                onClick={handleDeclineClick}
                onTouchEnd={handleDeclineTouch}
                disabled={isLoading}
                className="px-4 py-2 min-h-[40px] rounded-full border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors text-xs font-semibold disabled:opacity-50 active:scale-95"
                style={{ touchAction: 'manipulation' }}
              >
                {isLoading && pressedAction === "decline" ? (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </span>
                ) : t("extra.notifDecline")}
              </button>
            </div>
          )}

          {hasActionTaken && isFriendRequest && (
            <div className={cn(
              "mt-2 px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5",
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
            <motion.button
              onClick={handleSingleAction}
              className={cn(
                "mt-2 px-4 py-1.5 rounded-full transition-colors text-xs font-semibold",
                isPlayButton 
                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                  : "border border-foreground/30 text-foreground hover:bg-foreground/5"
              )}
              whileTap={{ scale: 0.95 }}
            >
              {getActionButtonLabel()}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});
