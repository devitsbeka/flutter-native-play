import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Gamepad2, Users, Sparkles } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useGenerationNotifications } from '@/hooks/useGenerationNotifications';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CompactNotificationCard } from '@/components/notifications/CompactNotificationCard';
import { CompactGenerationCard } from '@/components/notifications/CompactGenerationCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Custom time formatter for Georgian (no "დაახლოებით" prefix)
const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "ახლა";
  if (diffMins < 60) return `${diffMins} წუთის წინ`;
  if (diffHours < 24) return `${diffHours} საათის წინ`;
  if (diffDays < 7) return `${diffDays} დღის წინ`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} კვირის წინ`;
  return `${Math.floor(diffDays / 30)} თვის წინ`;
};

// Tab category mapping
const TAB_TYPES: Record<'games' | 'social' | 'trivia', string[]> = {
  games: ['room_invite', 'game_started', 'challenge', 'game_result'],
  social: ['friend_request', 'friend_accepted'],
  trivia: ['trivia_liked', 'trivia_saved', 'trivia_played'],
};

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { generationNotifications } = useGenerationNotifications();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'social' | 'trivia'>('games');

  // Filter notifications by active tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => TAB_TYPES[activeTab].includes(n.type));
  }, [notifications, activeTab]);

  // Get unread count per tab
  const getUnreadCount = (tab: 'games' | 'social' | 'trivia') => {
    return notifications.filter(n => 
      TAB_TYPES[tab].includes(n.type) && !n.read_at
    ).length;
  };

  // Mark only current tab's notifications as read
  const markTabAsRead = useCallback(async (tab: 'games' | 'social' | 'trivia') => {
    const unreadInTab = notifications.filter(n => 
      TAB_TYPES[tab].includes(n.type) && !n.read_at
    );
    
    // Mark each unread notification in this tab as read
    for (const notification of unreadInTab) {
      await markAsRead(notification.id);
    }
  }, [notifications, markAsRead]);

  // Track previous isOpen state to mark as read only when panel closes
  const prevIsOpenRef = useRef(isOpen);
  const viewedTabsRef = useRef<Set<'games' | 'social' | 'trivia'>>(new Set());

  // Track which tabs have been viewed while panel is open
  useEffect(() => {
    if (isOpen) {
      viewedTabsRef.current.add(activeTab);
    }
  }, [isOpen, activeTab]);

  // Mark viewed tabs as read when panel closes (transitions from open to closed)
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen) {
      // Panel just closed - mark all viewed tabs as read
      viewedTabsRef.current.forEach(tab => {
        markTabAsRead(tab);
      });
      // Reset viewed tabs for next open
      viewedTabsRef.current.clear();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, markTabAsRead]);

  const hasAnyContent = generationNotifications.length > 0 || notifications.length > 0;
  const hasTabContent = filteredNotifications.length > 0;

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

  const handleNavigate = async (notification: Notification) => {
    const data = notification.data as Record<string, unknown>;
    
    if (!notification.read_at) {
      markAsRead(notification.id);
    }
    
    switch (notification.type) {
      case 'game_started':
      case 'room_invite': {
        try {
          const roomId = (data?.room_id as string | undefined) ?? undefined;
          const roomCode = (data?.room_code as string | undefined) ?? undefined;

          if (roomId || roomCode) {
            const q = supabase.from('game_rooms').select('tv_session_id, room_code, status');
            const { data: room } = roomId
              ? await q.eq('id', roomId).maybeSingle()
              : await q.eq('room_code', String(roomCode).toUpperCase()).maybeSingle();

            // Check if room exists and is not cancelled
            if (room && room.status !== 'cancelled') {
              onClose();
              if (room.tv_session_id) {
                navigate(`/join/session/${room.tv_session_id}`);
              } else {
                navigate(`/team?join=${room.room_code}`);
              }
              return;
            }
          }

          // Fallback: use room_code from notification data
          if (roomCode) {
            onClose();
            navigate(`/team?join=${roomCode}`);
            return;
          }

          // No valid room data - show error
          toast.error('ოთახი ვეღარ მოიძებნა');
        } catch (error) {
          console.error('Navigation error:', error);
          toast.error('ვერ მოხერხდა თამაშზე გადასვლა');
        }
        break;
      }
      case 'friend_request':
      case 'friend_accepted':
        onClose();
        navigate('/team');
        break;
      case 'challenge':
        onClose();
        if (data?.room_code) {
          navigate(`/team?join=${data.room_code}`);
        } else {
          navigate('/team');
        }
        break;
      case 'game_result':
        onClose();
        if (data?.room_code) {
          navigate(`/team?join=${data.room_code}`);
        } else {
          navigate('/profile');
        }
        break;
      case 'trivia_liked':
      case 'trivia_saved':
      case 'trivia_played':
        onClose();
        if (data?.post_id) {
          navigate(`/trivia/${data.post_id}`);
        } else {
          navigate('/discover?tab=my-trivia');
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
        break;
    }
  };

  // Limit notifications in panel
  const displayedNotifications = filteredNotifications.slice(0, 15);

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

            {/* Tabs */}
            <div className="px-4 pt-3 pb-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'games' | 'social' | 'trivia')} className="w-full">
                <TabsList className="grid grid-cols-3 w-full bg-card/60 backdrop-blur-sm rounded-xl p-1 h-auto">
                  <TabsTrigger value="games" className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>თამაშები</span>
                    {getUnreadCount('games') > 0 && (
                      <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                        {getUnreadCount('games')}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="social" className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background">
                    <Users className="w-3.5 h-3.5" />
                    <span>მეგობრები</span>
                    {getUnreadCount('social') > 0 && (
                      <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                        {getUnreadCount('social')}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="trivia" className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ტრივია</span>
                    {getUnreadCount('trivia') > 0 && (
                      <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                        {getUnreadCount('trivia')}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
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
              ) : !hasTabContent ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <BellOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-center">
                    {activeTab === 'games' && 'თამაშების შეტყობინებები არ არის'}
                    {activeTab === 'social' && 'მეგობრების შეტყობინებები არ არის'}
                    {activeTab === 'trivia' && 'ტრივიის შეტყობინებები არ არის'}
                  </p>
                </div>
              ) : (
                <div className="bg-card/60 backdrop-blur-sm rounded-none overflow-hidden">
                  {/* Generation Notifications - only show in games tab */}
                  {activeTab === 'games' && generationNotifications.length > 0 && (
                    <>
                      {generationNotifications.map((notification) => (
                        <CompactGenerationCard
                          key={notification.id}
                          notification={notification}
                          onUseImage={handleUseGeneratedImage}
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
                        timeAgo={formatTimeAgo(new Date(notification.created_at))}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* See all link */}
              {filteredNotifications.length > 15 && (
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
