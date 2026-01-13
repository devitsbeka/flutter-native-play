import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check, X, ChevronDown, Trash2, ExternalLink, Loader2, Sparkles, User, ImageIcon } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useGenerationNotifications, GenerationNotification } from '@/hooks/useGenerationNotifications';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { translateNotificationTitle, translateNotificationMessage } from '@/utils/notificationTranslations';
import { PingPongVideo } from '@/components/shared/PingPongVideo';
import { MAP_VIDEOS } from '@/config/videoConfig';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Generation notification card with special design
function GenerationNotificationCard({
  notification,
  dateLocale,
}: {
  notification: GenerationNotification;
  dateLocale: typeof ka;
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  
  useEffect(() => {
    if (notification.status !== 'generating') return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - notification.startedAt.getTime()) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [notification.status, notification.startedAt]);

  const getIcon = () => {
    if (notification.generationType === 'avatar') return <User className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  const getTimeDisplay = () => {
    if (notification.status === 'generating') {
      const remaining = Math.max(0, notification.estimatedTime - elapsedTime);
      if (remaining > 0) {
        return `~${remaining} წმ`;
      }
      return 'მზადდება...';
    }
    return formatDistanceToNow(notification.startedAt, { addSuffix: false, locale: dateLocale });
  };

  const getStatusBadge = () => {
    switch (notification.status) {
      case 'generating':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            მზადდება
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-medium">
            <Check className="w-3 h-3" />
            მზადაა
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
            <X className="w-3 h-3" />
            შეცდომა
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "relative px-4 py-4 rounded-2xl transition-all border-l-4",
        notification.status === 'generating'
          ? "bg-primary/5 backdrop-blur-sm border-l-primary"
          : notification.status === 'completed'
          ? "bg-emerald-500/5 backdrop-blur-sm border-l-emerald-500"
          : "bg-destructive/5 backdrop-blur-sm border-l-destructive"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail or placeholder */}
        <div className="relative w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
          {notification.status === 'completed' && notification.imageUrl ? (
            <img 
              src={notification.imageUrl} 
              alt={notification.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground">{getIcon()}</span>
          )}
          {notification.status === 'generating' && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">
                {notification.title}
              </span>
            </div>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getTimeDisplay()}
          </p>
        </div>

        {/* Status indicator */}
        {notification.status === 'generating' && (
          <div className="flex-shrink-0 mt-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          </div>
        )}
        {notification.status === 'completed' && (
          <div className="flex-shrink-0 mt-2">
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

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
  const isRoomInvite = notification.type === 'room_invite';
  const isGameStarted = notification.type === 'game_started';
  const isGameResult = notification.type === 'game_result';
  const isTriviaAction = ['trivia_liked', 'trivia_saved', 'trivia_played'].includes(notification.type);
  
  // Friend request and challenge have Accept/Decline buttons when unread
  const hasDualActions = (isFriendRequest || isGameInvite) && isUnread;
  // Room invite, game started, game result, trivia actions have a single action button
  const hasSingleAction = (isRoomInvite || isGameStarted || isGameResult || isTriviaAction) && !hasDualActions;
  
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
        !hasDualActions && !hasSingleAction && "cursor-pointer hover:bg-card"
      )}
      onClick={() => {
        if (!hasDualActions && !hasSingleAction) {
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

          {/* Dual action buttons for friend requests and game invites */}
          {hasDualActions && (
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

          {/* Single action button for other actionable notifications */}
          {hasSingleAction && (
            <div className="mt-3">
              <motion.button
                onClick={handleSingleAction}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ExternalLink className="w-4 h-4" />
                {getActionButtonLabel()}
              </motion.button>
            </div>
          )}
        </div>

        {/* Unread indicator dot on right side */}
        {isUnread && (
          <div className="flex-shrink-0 mt-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();
  const { generationNotifications, hasActiveGenerations } = useGenerationNotifications();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [clearingAll, setClearingAll] = useState(false);

  const dateLocale = language === 'ka' ? ka : enUS;

  // Mark all as read when page loads
  useEffect(() => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  }, []);

  const displayedNotifications = notifications.slice(0, displayLimit);
  const hasMore = notifications.length > displayLimit;
  const hasAnyContent = generationNotifications.length > 0 || notifications.length > 0;

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
      case 'trivia_liked':
      case 'trivia_saved':
      case 'trivia_played':
        if (data?.trivia_id) {
          navigate(`/explore?trivia=${data.trivia_id}`);
        } else {
          navigate('/explore');
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

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      await clearAllNotifications();
      toast.success("ყველა შეტყობინება წაიშალა");
    } catch (error) {
      toast.error("შეცდომა მოხდა");
    } finally {
      setClearingAll(false);
    }
  };

  const handleShowMore = () => {
    setDisplayLimit((prev) => prev + 10);
  };

  return (
    <div className="min-h-screen pb-8 relative overflow-hidden">
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
      </div>

      {/* Content */}
      <div className="relative z-10 px-2 pb-8">
        {loading ? (
          <div className="flex flex-col items-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground mt-3">იტვირთება...</p>
          </div>
        ) : !hasAnyContent ? (
          <div className="flex flex-col items-center py-12">
            <div className="w-20 h-20 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center mb-4">
              <BellOff className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-2">შეტყობინებები არ არის</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[250px]">
              როცა რამე მოხდება, აქ გამოჩნდება
            </p>
          </div>
        ) : (
          <div className="space-y-2 px-2">
            {/* Generation Notifications Section - Always at top if any exist */}
            {generationNotifications.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    AI გენერაციები
                  </span>
                </div>
                <AnimatePresence mode="popLayout">
                  {generationNotifications.map((genNotif) => (
                    <GenerationNotificationCard
                      key={genNotif.id}
                      notification={genNotif}
                      dateLocale={dateLocale}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Regular Notifications */}
            <AnimatePresence mode="popLayout">
              {displayedNotifications.map((notification) => (
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

            {/* Show More Button */}
            {hasMore && (
              <motion.button
                onClick={handleShowMore}
                className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl bg-card/80 backdrop-blur-sm text-foreground hover:bg-card transition-colors font-medium"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <ChevronDown className="w-5 h-5" />
                მეტის ნახვა ({notifications.length - displayLimit} დარჩა)
              </motion.button>
            )}

            {/* Clear All Button */}
            {notifications.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <motion.button
                    className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={clearingAll}
                  >
                    <Trash2 className="w-5 h-5" />
                    ყველას წაშლა
                  </motion.button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">შეტყობინებების წაშლა</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      დარწმუნებული ხართ, რომ გსურთ ყველა შეტყობინების წაშლა? ეს მოქმედება შეუქცევადია.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-muted">გაუქმება</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleClearAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      წაშლა
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
