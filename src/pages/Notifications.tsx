import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { UniversalBottomNav } from '@/components/layout/UniversalBottomNav';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { NOTIFICATION_FILTER_CATEGORIES } from '@/config/notificationConfig';
import { translateNotificationTitle, translateNotificationMessage } from '@/utils/notificationTranslations';
import { PingPongVideo } from '@/components/shared/PingPongVideo';
import { MAP_VIDEOS } from '@/config/videoConfig';

type FilterType = 'all' | 'unread' | 'social' | 'games';

function NotificationCard({
  notification,
  onMarkRead,
  onNavigate,
  onAcceptFriend,
  onDeclineFriend,
  onAcceptInvite,
  onDeclineInvite,
  actionLoading,
  dateLocale,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onNavigate: (notification: Notification) => void;
  onAcceptFriend?: (friendshipId: string, notificationId: string) => void;
  onDeclineFriend?: (friendshipId: string, notificationId: string) => void;
  onAcceptInvite?: (invitationId: string, notificationId: string) => void;
  onDeclineInvite?: (invitationId: string, notificationId: string) => void;
  actionLoading?: string | null;
  dateLocale: typeof ka;
}) {
  const isUnread = !notification.read_at;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
    addSuffix: false,
    locale: dateLocale 
  });
  
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "relative px-4 py-4 rounded-2xl transition-all group border-l-4",
        isUnread
          ? "bg-card/90 backdrop-blur-sm border-l-primary"
          : "bg-card/70 backdrop-blur-sm border-l-transparent",
        !hasActions && "cursor-pointer hover:bg-card"
      )}
      onClick={() => {
        if (!hasActions) {
          if (isUnread) onMarkRead(notification.id);
          onNavigate(notification);
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <NotificationBadge type={notification.type} size="lg" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-bold text-base",
            isUnread ? "text-foreground" : "text-muted-foreground"
          )}>
            {translateNotificationTitle(notification.type, notification.title, notification.data as Record<string, unknown>)}
          </p>
          {notification.message && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
              {translateNotificationMessage(notification.type, notification.message, notification.data as Record<string, unknown>)}
            </p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1.5">
            {timeAgo}
          </p>

          {/* Action buttons for friend requests and game invites */}
          {hasActions && (
            <div className="flex gap-2 mt-3">
              <motion.button
                onClick={handleAccept}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/20 text-green-600 hover:bg-green-500/30 transition-colors text-sm font-medium disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Check className="w-4 h-4" />
                {isFriendRequest ? "მიღება" : "შესვლა"}
              </motion.button>
              <motion.button
                onClick={handleDecline}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X className="w-4 h-4" />
                უარყოფა
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const [filter, setFilter] = useState<FilterType>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const dateLocale = language === 'ka' ? ka : enUS;

  const filteredNotifications = notifications.filter((n) => {
    switch (filter) {
      case 'unread':
        return !n.read_at;
      case 'social':
        return NOTIFICATION_FILTER_CATEGORIES.social.includes(n.type as typeof NOTIFICATION_FILTER_CATEGORIES.social[number]);
      case 'games':
        return NOTIFICATION_FILTER_CATEGORIES.games.includes(n.type as typeof NOTIFICATION_FILTER_CATEGORIES.games[number]);
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
    
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    
    switch (notification.type) {
      case 'game_started':
      case 'room_invite':
        if (data?.room_code) {
          navigate(`/team?join=${data.room_code}`);
        } else {
          navigate('/team');
        }
        break;
      case 'friend_request':
      case 'friend_accepted':
        navigate('/team');
        break;
      case 'challenge':
        if (data?.room_code) {
          navigate(`/team?join=${data.room_code}`);
        } else {
          navigate('/team');
        }
        break;
      case 'game_result':
        if (data?.room_code) {
          navigate(`/team?join=${data.room_code}`);
        } else {
          navigate('/profile');
        }
        break;
      case 'reward':
        navigate('/');
        break;
      case 'achievement':
        navigate('/profile');
        break;
      default:
        break;
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'ყველა' },
    { key: 'unread', label: 'წაუკითხავი' },
    { key: 'social', label: 'სოციალური' },
    { key: 'games', label: 'თამაშები' },
  ];

  // Mark all as read when page loads
  useState(() => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  });

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0">
        <PingPongVideo src={MAP_VIDEOS.default} className="opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/80" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-bold text-xl text-foreground">შეტყობინებები</h2>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filters.map((f) => (
            <motion.button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border",
                filter === f.key
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary shadow-lg shadow-primary/25"
                  : "bg-card/80 backdrop-blur-sm text-foreground border-border/50 hover:bg-card"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-2 pb-8">
        {loading ? (
          <div className="flex flex-col items-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground mt-3">იტვირთება...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <div className="w-20 h-20 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center mb-4">
              <BellOff className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-2">შეტყობინებები არ არის</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[250px]">
              {filter === 'unread'
                ? "ყველა შეტყობინება წაკითხულია"
                : filter === 'social'
                ? "სოციალური აქტივობა არ არის"
                : filter === 'games'
                ? "თამაშის შეტყობინებები არ არის"
                : "როცა რამე მოხდება, აქ გამოჩნდება"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 px-2">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onNavigate={handleNavigate}
                  onAcceptFriend={handleAcceptFriend}
                  onDeclineFriend={handleDeclineFriend}
                  onAcceptInvite={handleAcceptInvite}
                  onDeclineInvite={handleDeclineInvite}
                  actionLoading={actionLoading}
                  dateLocale={dateLocale}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <UniversalBottomNav />
    </div>
  );
}