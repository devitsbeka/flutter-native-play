import { memo, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, X, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getNotificationConfig } from '@/config/notificationConfig';
import { Notification } from '@/hooks/useNotifications';
import { translateNotificationTitle, translateNotificationMessage } from '@/utils/notificationTranslations';

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

const SWIPE_THRESHOLD = 100;

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
  const [isDismissing, setIsDismissing] = useState(false);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [0, 1]);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, -50, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-SWIPE_THRESHOLD, -50, 0], [1, 0.8, 0.5]);

  const isUnread = !notification.read_at;
  const config = getNotificationConfig(notification.type);
  const Icon = config.icon;

  const isFriendRequest = notification.type === 'friend_request';
  const isGameInvite = notification.type === 'challenge';
  const isRoomInvite = notification.type === 'room_invite';
  const isGameStarted = notification.type === 'game_started';
  const isGameResult = notification.type === 'game_result';
  const isTriviaAction = ['trivia_liked', 'trivia_saved', 'trivia_played'].includes(notification.type);

  const hasDualActions = (isFriendRequest || isGameInvite) && isUnread;
  const hasSingleAction = (isRoomInvite || isGameStarted || isGameResult || isTriviaAction) && !hasDualActions;

  const isLoading = actionLoading === notification.id;

  // Get avatar from notification data
  const avatarUrl = notification.data?.sender_avatar as string | undefined;
  const senderName = notification.data?.sender_nickname as string || notification.data?.sender_name as string || '';

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFriendRequest && notification.data?.friendship_id) {
      onAcceptFriend?.(notification.data.friendship_id as string, notification.id);
    } else if (isGameInvite && notification.data?.invitation_id) {
      onAcceptInvite?.(notification.data.invitation_id as string, notification.id);
    }
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFriendRequest && notification.data?.friendship_id) {
      onDeclineFriend?.(notification.data.friendship_id as string, notification.id);
    } else if (isGameInvite && notification.data?.invitation_id) {
      onDeclineInvite?.(notification.data.invitation_id as string, notification.id);
    }
  };

  const handleSingleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnread) onMarkRead(notification.id);
    onNavigate(notification);
  };

  const getActionButtonLabel = () => {
    if (isRoomInvite || isGameStarted) return 'შესვლა';
    if (isGameResult) return 'ნახვა';
    if (isTriviaAction) return 'ნახვა';
    return 'გახსნა';
  };

  const handleClick = () => {
    if (!hasDualActions && !hasSingleAction) {
      if (isUnread) onMarkRead(notification.id);
      onNavigate(notification);
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && onDismiss) {
      setIsDismissing(true);
      onDismiss(notification.id);
    }
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
    <div className="relative overflow-hidden">
      {/* Delete background indicator */}
      <motion.div 
        className="absolute inset-0 bg-destructive flex items-center justify-end pr-6"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 className="w-5 h-5 text-destructive-foreground" />
        </motion.div>
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, opacity }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative flex items-start gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 transition-colors bg-background",
          !hasDualActions && !hasSingleAction && "cursor-pointer active:bg-foreground/5"
        )}
        onClick={handleClick}
      >
        {/* Avatar with type indicator badge */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-11 h-11">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback 
              className="text-sm font-bold text-primary-foreground"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(270, 70%, 50%) 100%)"
              }}
            >
              {senderName ? senderName.charAt(0).toUpperCase() : <Icon className="w-5 h-5" />}
            </AvatarFallback>
          </Avatar>
          
          {/* Type indicator badge - solid background for visibility */}
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background",
            config.bgColor.replace('/20', '')
          )}>
            <Icon className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className={cn(
                  "font-bold",
                  isUnread ? "text-foreground" : "text-muted-foreground"
                )}>
                  {translateNotificationTitle(notification.type, notification.title, notification.data as Record<string, unknown>)}
                </span>
                {notification.message && (
                  <span className="text-muted-foreground ml-1">
                    {translateNotificationMessage(notification.type, notification.message, notification.data as Record<string, unknown>)}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {timeAgo}
              </p>
            </div>

            {/* Unread indicator */}
            {isUnread && (
              <div className="flex-shrink-0 mt-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
            )}
          </div>

          {/* Action buttons */}
          {hasDualActions && (
            <div className="flex gap-2 mt-2">
              <motion.button
                onClick={handleAccept}
                disabled={isLoading}
                className="px-4 py-1.5 rounded-full border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 transition-colors text-xs font-semibold disabled:opacity-50"
                whileTap={{ scale: 0.95 }}
              >
                {isFriendRequest ? "მიღება" : "შესვლა"}
              </motion.button>
              <motion.button
                onClick={handleDecline}
                disabled={isLoading}
                className="px-4 py-1.5 rounded-full border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors text-xs font-semibold disabled:opacity-50"
                whileTap={{ scale: 0.95 }}
              >
                უარყოფა
              </motion.button>
            </div>
          )}

          {hasSingleAction && (
            <motion.button
              onClick={handleSingleAction}
              className="mt-2 px-4 py-1.5 rounded-full border border-foreground/30 text-foreground hover:bg-foreground/5 transition-colors text-xs font-semibold"
              whileTap={{ scale: 0.95 }}
            >
              {getActionButtonLabel()}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
});
