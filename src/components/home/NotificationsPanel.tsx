import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getNotificationConfig, NOTIFICATION_FILTER_CATEGORIES } from '@/config/notificationConfig';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateNotificationTitle, translateNotificationMessage } from '@/utils/notificationTranslations';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'unread' | 'friends' | 'games' | 'rewards';

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
  onAcceptFriend,
  onDeclineFriend,
  onAcceptInvite,
  onDeclineInvite,
  actionLoading,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notification: Notification) => void;
  onAcceptFriend?: (friendshipId: string, notificationId: string) => void;
  onDeclineFriend?: (friendshipId: string, notificationId: string) => void;
  onAcceptInvite?: (invitationId: string, notificationId: string) => void;
  onDeclineInvite?: (invitationId: string, notificationId: string) => void;
  actionLoading?: string | null;
}) {
  const isUnread = !notification.read_at;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
  
  const isFriendRequest = notification.type === 'friend_request';
  const isGameInvite = notification.type === 'challenge';
  const hasActions = (isFriendRequest || isGameInvite) && isUnread;
  const isLoading = actionLoading === notification.id;

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

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "relative p-4 rounded-xl border transition-all group",
        isUnread
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
          : "bg-secondary/50 border-border/50 hover:bg-secondary",
        !hasActions && "cursor-pointer"
      )}
      onClick={() => {
        if (!hasActions) {
          if (isUnread) onMarkRead(notification.id);
          onNavigate(notification);
        }
      }}
    >
      {/* Unread indicator */}
      {isUnread && !hasActions && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <NotificationBadge type={notification.type} size="md" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium text-sm line-clamp-1",
            isUnread ? "text-foreground" : "text-muted-foreground"
          )}>
            {translateNotificationTitle(notification.type, notification.title, notification.data as Record<string, unknown>)}
          </p>
          {notification.message && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {translateNotificationMessage(notification.type, notification.message, notification.data as Record<string, unknown>)}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1">
            {timeAgo}
          </p>

          {/* Action buttons for friend requests and game invites */}
          {hasActions && (
            <div className="flex gap-2 mt-3">
              <motion.button
                onClick={handleAccept}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/20 text-green-600 hover:bg-green-500/30 transition-colors text-sm font-medium disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Check className="w-4 h-4" />
                {isFriendRequest ? "მიღება" : "შესვლა"}
              </motion.button>
              <motion.button
                onClick={handleDecline}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="w-4 h-4" />
                უარყოფა
              </motion.button>
            </div>
          )}
        </div>

        {/* Delete action - only show for non-actionable items */}
        {!hasActions && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const [filter, setFilter] = useState<FilterType>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Mark all as read when panel opens
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    switch (filter) {
      case 'unread':
        return !n.read_at;
      case 'friends':
        return NOTIFICATION_FILTER_CATEGORIES.social.includes(n.type as typeof NOTIFICATION_FILTER_CATEGORIES.social[number]);
      case 'games':
        return NOTIFICATION_FILTER_CATEGORIES.games.includes(n.type as typeof NOTIFICATION_FILTER_CATEGORIES.games[number]);
      case 'rewards':
        return NOTIFICATION_FILTER_CATEGORIES.rewards.includes(n.type as typeof NOTIFICATION_FILTER_CATEGORIES.rewards[number]);
      default:
        return true;
    }
  });

  const handleAcceptFriend = async (friendshipId: string, notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await acceptFriendRequest(friendshipId);
      await markAsRead(notificationId);
      toast.success("მეგობრის მოთხოვნა მიღებულია!");
    } catch (error) {
      toast.error("შეცდომა მოხდა");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineFriend = async (friendshipId: string, notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await declineFriendRequest(friendshipId);
      await deleteNotification(notificationId);
      toast.success("მოთხოვნა უარყოფილია");
    } catch (error) {
      toast.error("შეცდომა მოხდა");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptInvite = async (invitationId: string, notificationId: string) => {
    setActionLoading(notificationId);
    try {
      const roomCode = await acceptInvitation(invitationId);
      await markAsRead(notificationId);
      if (roomCode) {
        onClose();
        navigate(`/team?join=${roomCode}`);
      }
    } catch (error) {
      toast.error("შეცდომა მოხდა");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineInvite = async (invitationId: string, notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await declineInvitation(invitationId);
      await deleteNotification(notificationId);
      toast.success("მოწვევა უარყოფილია");
    } catch (error) {
      toast.error("შეცდომა მოხდა");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNavigate = (notification: Notification) => {
    const data = notification.data as Record<string, unknown>;
    
    // Mark as read before navigating
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type using data fields
    switch (notification.type) {
      case 'game_started':
      case 'room_invite':
        if (data?.room_code) {
          onClose();
          navigate(`/team?join=${data.room_code}`);
        } else {
          onClose();
          navigate('/team');
        }
        break;
      case 'friend_request':
      case 'friend_accepted':
        onClose();
        navigate('/team');
        break;
      case 'challenge':
        if (data?.room_code) {
          onClose();
          navigate(`/team?join=${data.room_code}`);
        } else {
          onClose();
          navigate('/team');
        }
        break;
      case 'game_result':
        if (data?.room_code) {
          onClose();
          navigate(`/team?join=${data.room_code}`);
        } else {
          onClose();
          navigate('/profile');
        }
        break;
      case 'reward':
        onClose();
        navigate('/');
        break;
      case 'achievement':
        onClose();
        navigate('/profile');
        break;
      default:
        onClose();
        break;
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('notifications.all') },
    { key: 'unread', label: t('notifications.unread') },
    { key: 'friends', label: t('notifications.social') },
    { key: 'games', label: t('notifications.games') },
    { key: 'rewards', label: t('notifications.rewards') },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[60] bg-card flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border/50">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{t('notifications.title')}</h2>
                    {unreadCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {unreadCount} {t('notifications.unread')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
                {filters.map((f) => (
                  <motion.button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all flex-shrink-0"
                    style={{
                      background: filter === f.key
                        ? "linear-gradient(135deg, hsl(263 70% 55%) 0%, hsl(280 65% 50%) 100%)"
                        : "hsl(var(--muted))",
                      color: filter === f.key ? "white" : "hsl(var(--muted-foreground))",
                      boxShadow: filter === f.key
                        ? "0 4px 0 hsl(263 60% 40%), inset 0 1px 0 hsl(0 0% 100% / 0.2)"
                        : "0 2px 0 hsl(var(--border))",
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {f.label}
                    {f.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                        {unreadCount}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-8">
              {loading ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground mt-3">{t('notifications.loading')}</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BellOff className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-2">{t('notifications.noNotifications')}</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-[250px]">
                    {filter === 'unread'
                      ? t('notifications.allRead')
                      : filter === 'friends'
                      ? t('notifications.noFriendActivity')
                      : filter === 'games'
                      ? t('notifications.noGameNotifications')
                      : t('notifications.whenSomethingHappens')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredNotifications.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onDelete={deleteNotification}
                        onNavigate={handleNavigate}
                        onAcceptFriend={handleAcceptFriend}
                        onDeclineFriend={handleDeclineFriend}
                        onAcceptInvite={handleAcceptInvite}
                        onDeclineInvite={handleDeclineInvite}
                        actionLoading={actionLoading}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
