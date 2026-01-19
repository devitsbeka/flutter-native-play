import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useGenerationNotifications } from '@/hooks/useGenerationNotifications';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ka, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { CompactNotificationCard } from '@/components/notifications/CompactNotificationCard';
import { CompactGenerationCard } from '@/components/notifications/CompactGenerationCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { PingPongVideo } from '@/components/shared/PingPongVideo';
import { MAP_VIDEOS } from '@/config/videoConfig';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { generationNotifications, hasActiveGenerations } = useGenerationNotifications();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const dateLocale = language === 'ka' ? ka : enUS;

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
    
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    
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
        if (data?.post_id) {
          navigate(`/team?playTrivia=${data.post_id}`);
        } else {
          navigate('/explore?tab=my-trivia');
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

  // Limit notifications in panel
  const displayedNotifications = notifications.slice(0, 15);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 w-screen h-screen bg-black/40 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* Panel - slides from right, 35% width on desktop, full on mobile */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-[45%] lg:w-[35%] z-[9999] flex flex-col overflow-hidden bg-background border-l border-border shadow-2xl"
          >

            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="font-bold text-base text-foreground">აქტივობა</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !hasAnyContent ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <BellOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-center">
                    შეტყობინებები არ არის
                  </p>
                </div>
              ) : (
                <div className="bg-card/60 backdrop-blur-sm rounded-none overflow-hidden">
                  {/* Generation Notifications */}
                  {generationNotifications.length > 0 && (
                    <>
                      {generationNotifications.map((notification) => (
                        <CompactGenerationCard
                          key={notification.id}
                          notification={notification}
                          onUseImage={handleUseGeneratedImage}
                          dateLocale={dateLocale}
                        />
                      ))}
                    </>
                  )}

                  {/* Regular Notifications */}
                  <AnimatePresence mode="popLayout">
                    {displayedNotifications.map((notification) => (
                      <CompactNotificationCard
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onNavigate={handleNavigate}
                        onAcceptFriend={handleAcceptFriend}
                        onDeclineFriend={handleDeclineFriend}
                        onAcceptInvite={handleAcceptInvite}
                        onDeclineInvite={handleDeclineInvite}
                        onDismiss={deleteNotification}
                        actionLoading={actionLoading}
                        timeAgo={formatDistanceToNow(new Date(notification.created_at), { 
                          addSuffix: false,
                          locale: dateLocale 
                        })}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* See all link */}
              {notifications.length > 15 && (
                <motion.button
                  onClick={() => {
                    onClose();
                    navigate('/notifications');
                  }}
                  className="w-full mt-4 flex items-center justify-center px-4 py-3 rounded-xl bg-card/60 backdrop-blur-sm text-foreground font-medium hover:bg-card/80 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  ყველას ნახვა
                </motion.button>
              )}

              <div className="h-8" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
