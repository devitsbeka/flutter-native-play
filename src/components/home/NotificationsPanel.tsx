import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { typeInTab, type NotificationTab } from '@/config/notificationTabs';
import { PUBLIC_SHARING_ENABLED } from '@/config/features';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Gamepad2, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useGenerationNotifications } from '@/hooks/useGenerationNotifications';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CompactNotificationCard } from '@/components/notifications/CompactNotificationCard';
import { NotificationDetailModal } from '@/components/notifications/NotificationDetailModal';
import { CompactGenerationCard } from '@/components/notifications/CompactGenerationCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Language-aware time formatter
const formatTimeAgo = (date: Date, t: (key: string, params?: Record<string, string | number>) => string) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return t("extra.timeNow");
  if (diffMins < 60) return t("extra.timeMinutesAgo", { count: diffMins });
  if (diffHours < 24) return t("extra.timeHoursAgo", { count: diffHours });
  if (diffDays < 7) return t("extra.timeDaysAgo", { count: diffDays });
  if (diffDays < 30) return t("extra.timeWeeksAgo", { count: Math.floor(diffDays / 7) });
  return t("extra.timeMonthsAgo", { count: Math.floor(diffDays / 30) });
};

// Tab category mapping
/**
 * Which tab a notification belongs in — see config/notificationTabs.ts.
 *
 * That file is shared with the notifications page, which carried a
 * byte-identical copy of these lists. Games is everything else rather than a
 * list of its own: naming all three explicitly covered nine of the twenty-one
 * types that exist, so a welcome, a level-up, an achievement or a reward
 * appeared in no tab at all — invisible here, while still counted in the
 * bell's badge.
 */
type NotifTab = NotificationTab;

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'games' | 'social' | 'trivia';
}

export function NotificationsPanel({ isOpen, onClose, defaultTab }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { generationNotifications } = useGenerationNotifications();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Determine best default tab based on unread notifications
  const getBestDefaultTab = (): 'games' | 'social' | 'trivia' => {
    if (defaultTab) return defaultTab;
    
    const socialUnread = notifications.filter(n => 
      typeInTab(n.type, 'social') && !n.read_at
    ).length;
    const triviaUnread = notifications.filter(n => 
      typeInTab(n.type, 'trivia') && !n.read_at
    ).length;
    const gamesUnread = notifications.filter(n => 
      typeInTab(n.type, 'games') && !n.read_at
    ).length;
    
    // Prioritize tabs with unread items. The trivia tab is hidden while
    // public sharing is off, so it must never be the landing tab.
    if (socialUnread > 0) return 'social';
    if (PUBLIC_SHARING_ENABLED && triviaUnread > 0) return 'trivia';
    if (gamesUnread > 0) return 'games';
    return 'games';
  };
  
  const [activeTab, setActiveTab] = useState<NotifTab>('games');
  const [detailNotification, setDetailNotification] = useState<Notification | null>(null);
  
  // Reset to best tab when panel opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(getBestDefaultTab());
    }
  }, [isOpen, defaultTab, notifications]);

  // Filter notifications by active tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => typeInTab(n.type, activeTab));
  }, [notifications, activeTab]);

  // Get unread count per tab
  const getUnreadCount = (tab: 'games' | 'social' | 'trivia') => {
    return notifications.filter(n => 
      typeInTab(n.type, tab) && !n.read_at
    ).length;
  };

  // Closing the panel reads everything.
  //
  // It used to mark only the tabs that had been looked at, while the bell's
  // badge counts every unread notification — so opening notifications and
  // closing them again left it lit. Worse, the tab lists here name their
  // types explicitly and between them cover nine of the twenty-one that
  // exist: a welcome, a level-up or an achievement could not be marked read
  // from this panel at all, and sat in the badge forever.
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (prevIsOpenRef.current && !isOpen && unreadCount > 0) {
      void markAllAsRead();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, unreadCount, markAllAsRead]);

  const hasAnyContent = generationNotifications.length > 0 || notifications.length > 0;
  const hasTabContent = filteredNotifications.length > 0;

  // Handle using generated image (copy URL and navigate for cover images)
  const handleUseGeneratedImage = (imageUrl: string, type: 'avatar' | 'cover') => {
    if (type === 'cover') {
      navigator.clipboard.writeText(imageUrl).then(() => {
        toast.success(t("notificationsPanel.urlCopied"), {
          duration: 4000,
        });
        onClose();
        navigate('/team?tab=my-content');
      }).catch(() => {
        toast.error(t("notificationsPanel.copyFailed"));
      });
    } else if (type === 'avatar') {
      toast.success(t("notificationsPanel.avatarAlreadySet"), { duration: 3000 });
      onClose();
      navigate('/profile');
    }
  };

  const handleAcceptFriend = async (friendshipId: string, notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await acceptFriendRequest(friendshipId);
      
      // Get current notification data to preserve it
      const { data: currentNotification } = await supabase
        .from('notifications')
        .select('data')
        .eq('id', notificationId)
        .single();
      
      // Merge with action_taken
      const mergedData = {
        ...(currentNotification?.data as Record<string, unknown> || {}),
        action_taken: 'accepted'
      };
      
      // Update notification to show accepted state
      await supabase
        .from('notifications')
        .update({ 
          read_at: new Date().toISOString(),
          data: mergedData
        })
        .eq('id', notificationId);
        
      toast.success(t("notificationsPanel.friendRequestAccepted"));
    } catch (error) {
      toast.error(t("notificationsPanel.errorOccurred"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineFriend = async (friendshipId: string, notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await declineFriendRequest(friendshipId);
      
      // Get current notification data to preserve it
      const { data: currentNotification } = await supabase
        .from('notifications')
        .select('data')
        .eq('id', notificationId)
        .single();
      
      // Merge with action_taken
      const mergedData = {
        ...(currentNotification?.data as Record<string, unknown> || {}),
        action_taken: 'declined'
      };
      
      // Update notification to show declined state instead of deleting
      await supabase
        .from('notifications')
        .update({ 
          read_at: new Date().toISOString(),
          data: mergedData
        })
        .eq('id', notificationId);
        
      toast.success(t("notificationsPanel.friendRequestDeclined"));
    } catch (error) {
      toast.error(t("notificationsPanel.errorOccurred"));
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
      toast.error(t("notificationsPanel.errorOccurred"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineInvite = async (invitationId: string, notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await declineInvitation(invitationId);
      await deleteNotification(notificationId);
      toast.success(t("notificationsPanel.inviteDeclined"));
    } catch (error) {
      toast.error(t("notificationsPanel.errorOccurred"));
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
          toast.error(t("notificationsPanel.roomNotFound"));
        } catch (error) {
          console.error('Navigation error:', error);
          toast.error(t("notificationsPanel.navigationFailed"));
        }
        break;
      }
      case 'friend_request':
      case 'friend_accepted':
        onClose();
        navigate('/team');
        break;
      case 'challenge':
      case 'room_ping':
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
          navigate('/team?tab=my-content');
        }
        break;
      case 'reward':
      case 'daily_reward':
      case 'streak':
      case 'level_up':
      case 'achievement':
      case 'system':
      case 'welcome':
        // "What you earned" popup — these have no page to go to, and
        // dumping the player on the home screen showed them nothing
        setDetailNotification(notification);
        break;
      case 'billing':
      case 'subscription':
        onClose();
        navigate('/profile?tab=PRO');
        break;
      default:
        setDetailNotification(notification);
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
            className="fixed top-0 right-0 bottom-0 safe-screen w-full md:w-[45%] lg:w-[35%] z-[9999] flex flex-col overflow-hidden bg-background border-l border-border shadow-2xl"
          >

            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-foreground">{t("notificationsPanel.activity")}</h2>
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
                <TabsList className={`grid ${PUBLIC_SHARING_ENABLED ? "grid-cols-3" : "grid-cols-2"} w-full bg-card/60 backdrop-blur-sm rounded-xl p-1 h-auto`}>
                  <TabsTrigger value="games" className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>{t("notificationsPanel.gamesTab")}</span>
                    {getUnreadCount('games') > 0 && (
                      <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                        {getUnreadCount('games')}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="social" className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background">
                    <Users className="w-3.5 h-3.5" />
                    <span>{t("notificationsPanel.socialTab")}</span>
                    {getUnreadCount('social') > 0 && (
                      <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                        {getUnreadCount('social')}
                      </span>
                    )}
                  </TabsTrigger>
                  {PUBLIC_SHARING_ENABLED && (
                  <TabsTrigger value="trivia" className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t("notificationsPanel.triviaTab")}</span>
                    {getUnreadCount('trivia') > 0 && (
                      <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                        {getUnreadCount('trivia')}
                      </span>
                    )}
                  </TabsTrigger>
                  )}
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
                    {t("notificationsPanel.noNotifications")}
                  </p>
                </div>
              ) : !hasTabContent ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <BellOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-center">
                    {activeTab === 'games' && t("notificationsPanel.noGamesNotifications")}
                    {activeTab === 'social' && t("notificationsPanel.noSocialNotifications")}
                    {activeTab === 'trivia' && t("notificationsPanel.noTriviaNotifications")}
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
                        timeAgo={formatTimeAgo(new Date(notification.created_at), t)}
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
                  {t("notificationsPanel.viewAll")}
                </motion.button>
              )}

              <div className="h-8" />
            </div>
          </motion.div>

          <NotificationDetailModal
            notification={detailNotification}
            onClose={() => setDetailNotification(null)}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
