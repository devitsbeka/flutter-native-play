import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Check, Trash2, Loader2, Sparkles, User, ImageIcon, ExternalLink } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useGenerationNotifications, GenerationNotification } from '@/hooks/useGenerationNotifications';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { toast } from 'sonner';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateNotificationTitle, translateNotificationMessage } from '@/utils/notificationTranslations';
import { PingPongVideo } from '@/components/shared/PingPongVideo';
import { MAP_VIDEOS } from '@/config/videoConfig';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Generation notification card with special design
function GenerationNotificationCard({
  notification,
  onUseImage,
}: {
  notification: GenerationNotification;
  onUseImage?: (imageUrl: string, type: 'avatar' | 'cover') => void;
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
    return formatDistanceToNow(notification.startedAt, { addSuffix: false, locale: ka });
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

  const handleUseImage = () => {
    if (notification.imageUrl && onUseImage) {
      onUseImage(notification.imageUrl, notification.generationType);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "relative px-4 py-3 rounded-2xl transition-all border-l-4",
        notification.status === 'generating'
          ? "bg-primary/5 backdrop-blur-sm border-l-primary"
          : notification.status === 'completed'
          ? "bg-emerald-500/5 backdrop-blur-sm border-l-emerald-500"
          : "bg-destructive/5 backdrop-blur-sm border-l-destructive"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Thumbnail or placeholder */}
        <div className="relative w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
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
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">
              {notification.title}
            </span>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {getTimeDisplay()}
          </p>
        </div>

        {/* Action buttons for completed generations */}
        {notification.status === 'completed' && notification.imageUrl && (
          <button
            onClick={handleUseImage}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>გამოყენება</span>
          </button>
        )}

        {/* Status indicator for generating */}
        {notification.status === 'generating' && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

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
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: false, locale: ka });
  
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

        {/* Unread indicator and delete button */}
        <div className="flex flex-col items-center gap-2">
          {isUnread && (
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { generationNotifications, hasActiveGenerations } = useGenerationNotifications();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Mark all as read when panel opens
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen]);

  const hasAnyContent = generationNotifications.length > 0 || notifications.length > 0;

  // Handle using generated image (copy URL and navigate for cover images)
  const handleUseGeneratedImage = (imageUrl: string, type: 'avatar' | 'cover') => {
    if (type === 'cover') {
      // Copy URL to clipboard
      navigator.clipboard.writeText(imageUrl).then(() => {
        toast.success("URL დაკოპირდა! გახსენი ტრივია My Trivia-ში გარეკანის გამოსაყენებლად", {
          duration: 4000,
        });
        onClose();
        navigate('/explore?tab=my-trivia');
      }).catch(() => {
        toast.error("კოპირება ვერ მოხერხდა");
      });
    } else if (type === 'avatar') {
      // For avatar, navigate to profile
      toast.success("ავატარი უკვე დაყენებულია!", { duration: 3000 });
      onClose();
      navigate('/profile');
    }
  };

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
    
    // Close panel
    onClose();
    
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
          >
            {/* Video Background */}
            <div className="absolute inset-0">
              <PingPongVideo src={MAP_VIDEOS.default} className="opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/80" />
            </div>

            {/* Header */}
            <div className="relative z-10 px-4 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="font-bold text-xl text-foreground">შეტყობინებები</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 overflow-y-auto px-2 pb-8">
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
                    <div className="mb-3">
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
                            onUseImage={handleUseGeneratedImage}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Regular Notifications */}
                  <AnimatePresence mode="popLayout">
                    {notifications.map((notification) => (
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
