import { useMemo, useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, ChevronDown, Trash2, X, Gamepad2, Users, Sparkles } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGenerationNotifications } from '@/hooks/useGenerationNotifications';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { cn } from '@/lib/utils';
import { ka } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { shortTimeAgo } from '@/utils/shortTimeAgo';
import { typeInTab, type NotificationTab } from '@/config/notificationTabs';
import { CompactNotificationCard } from '@/components/notifications/CompactNotificationCard';
import { NotificationDetailModal } from '@/components/notifications/NotificationDetailModal';
import { CompactGenerationCard } from '@/components/notifications/CompactGenerationCard';
import { PageHeader } from "@/components/shared/PageHeader";
import { PingPongVideo } from '@/components/shared/PingPongVideo';
import { MAP_VIDEOS } from '@/config/videoConfig';
import { supabase } from '@/integrations/supabase/client';
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

export default function Notifications() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();
  const { generationNotifications, hasActiveGenerations } = useGenerationNotifications();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [clearingAll, setClearingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>('games');
  const [detailNotification, setDetailNotification] = useState<Notification | null>(null);

  const dateLocale = language === 'ka' ? ka : enUS;

  // Tab mapping lives in config/notificationTabs.ts — this file and
  // NotificationsPanel.tsx each had their own copy of it.

  // Filter notifications by active tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => typeInTab(n.type, activeTab));
  }, [notifications, activeTab, typeInTab]);

  // Get unread count per tab
  const getUnreadCount = (tab: NotificationTab) => {
    return notifications.filter(n => typeInTab(n.type, tab) && !n.read_at).length;
  };

  // Opening this screen reads everything, not just the tab you land on.
  //
  // The bell's badge counts every unread notification, so clearing one tab
  // at a time left it lit after the player had opened notifications and
  // closed them again — they had, as far as they were concerned, looked.
  // Half the notification types could not be cleared at all from here.
  //
  // The short delay is deliberate: the per-tab counts are worth seeing for a
  // moment before they go.
  useEffect(() => {
    if (loading || unreadCount === 0) return;
    const timer = setTimeout(() => {
      void markAllAsRead();
    }, 500);
    return () => clearTimeout(timer);
  }, [loading, unreadCount, markAllAsRead]);

  const displayedNotifications = filteredNotifications.slice(0, displayLimit);
  const hasMore = filteredNotifications.length > displayLimit;
  const hasAnyContent = generationNotifications.length > 0 || notifications.length > 0;
  const hasTabContent = filteredNotifications.length > 0;

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
        
      toast.success(t("extra.notifFriendAcceptedToast"));
    } catch (error) {
      toast.error(t("extra.errorOccurred"));
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
        
      toast.success(t("extra.notifRequestDeclinedToast"));
    } catch (error) {
      toast.error(t("extra.errorOccurred"));
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
      toast.error(t("extra.errorOccurred"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineInvite = async (invitationId: string, notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await declineInvitation(invitationId);
      await deleteNotification(notificationId);
      toast.success(t("extra.notifInviteDeclinedToast"));
    } catch (error) {
      toast.error(t("extra.errorOccurred"));
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
        (async () => {
          try {
            const roomId = (data?.room_id as string | undefined) ?? undefined;
            const roomCode = (data?.room_code as string | undefined) ?? undefined;

            if (roomId || roomCode) {
              const q = supabase.from('game_rooms').select('tv_session_id, room_code');
              const { data: room } = roomId
                ? await q.eq('id', roomId).maybeSingle()
                : await q.eq('room_code', String(roomCode).toUpperCase()).maybeSingle();

              const tvSessionId = (room as any)?.tv_session_id as string | null | undefined;
              if (tvSessionId) {
                navigate(`/join/session/${tvSessionId}`);
                return;
              }

              if ((room as any)?.room_code) {
                navigate(`/team?join=${(room as any).room_code}`);
                return;
              }
            }

            if (roomCode) {
              navigate(`/team?join=${roomCode}`);
            } else {
              navigate('/team');
            }
          } catch {
            toast.error(t("extra.notifCouldNotNavigate"));
            navigate('/team');
          }
        })();
        break;
      case 'friend_request':
      case 'friend_accepted':
        navigate('/team');
        break;
      case 'challenge':
      case 'room_ping':
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
        // Navigate to trivia lobby page to view the trivia details
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
        navigate('/profile?tab=PRO');
        break;
      default:
        setDetailNotification(notification);
        break;
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      // This tab's notifications, not the account's. The button lives under
      // one tab's list and reads as belonging to it.
      await clearAllNotifications(filteredNotifications.map((n) => n.id));
      toast.success(t("extra.notifAllDeleted"));
    } catch (error) {
      toast.error(t("extra.errorOccurred"));
    } finally {
      setClearingAll(false);
    }
  };

  const handleShowMore = () => {
    setDisplayLimit((prev) => prev + 20);
  };

  return (
    <MainLayout showPlayButton={false}>
    <div className="min-h-screen pb-8 relative overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0">
        <PingPongVideo src={MAP_VIDEOS.default} className="opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/80" />
      </div>

      {/* The shared header. The bell that used to sit beside the title is
          gone with it — the page is the notifications list, so an icon
          repeating that said nothing the title did not. */}
      <PageHeader title={t("extra.notifActivity")} className="relative z-10" />

      {/* Tabs */}
      <div className="relative z-10 px-4 pt-3 max-w-[700px] md:max-w-[600px] mx-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationTab)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-card/60 backdrop-blur-sm rounded-xl p-1 h-auto">
            <TabsTrigger value="games" className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>{t("extra.notifGamesTab")}</span>
              {getUnreadCount('games') > 0 && (
                <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                  {getUnreadCount('games')}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background">
              <Users className="w-3.5 h-3.5" />
              <span>{t("extra.notifSocialTab")}</span>
              {getUnreadCount('social') > 0 && (
                <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                  {getUnreadCount('social')}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="trivia" className="flex items-center gap-1.5 text-xs py-2 data-[state=active]:bg-background">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("extra.notifTriviaTab")}</span>
              {getUnreadCount('trivia') > 0 && (
                <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
                  {getUnreadCount('trivia')}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content - full width, hidden scroll */}
      <div className="relative z-10 px-0 overflow-y-auto scrollbar-hide max-w-[700px] md:max-w-[600px] mx-auto">
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
              {t("extra.notifNoNotifications")}
            </p>
          </div>
        ) : !hasTabContent ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <BellOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center">
              {activeTab === 'games' && t("extra.notifNoGames")}
              {activeTab === 'social' && t("extra.notifNoSocial")}
              {activeTab === 'trivia' && t("extra.notifNoTrivia")}
            </p>
          </div>
        ) : (
          <div className="bg-card/60 backdrop-blur-sm rounded-none overflow-hidden pb-2 mt-3">
            {/* Generation Notifications - only show in games tab */}
            {activeTab === 'games' && generationNotifications.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-background/40 border-b border-border/30">
                  {t("extra.notifAiGeneration")}
                </div>
                {generationNotifications.map((notification) => (
                  <CompactGenerationCard
                    key={notification.id}
                    notification={notification}
                    dateLocale={dateLocale}
                  />
                ))}
              </>
            )}

            {/* Filtered Notifications */}
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
                  timeAgo={shortTimeAgo(notification.created_at, t)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Show More / Clear All */}
        {hasAnyContent && (
          <div className="flex flex-col gap-3 mt-4 px-2">
            {hasMore && (
              <motion.button
                onClick={handleShowMore}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-card/60 backdrop-blur-sm text-foreground font-medium hover:bg-card/80 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                <ChevronDown className="w-5 h-5" />
                {t("extra.notifShowMore")}
              </motion.button>
            )}

            {notifications.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <motion.button
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors"
                    whileTap={{ scale: 0.98 }}
                    disabled={clearingAll}
                  >
                    <Trash2 className="w-5 h-5" />
                    {t("extra.notifDeleteAll")}
                  </motion.button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("extra.notifDeleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("extra.notifDeleteConfirmDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("extra.notifCancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("extra.notifDeleteButton")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}

        <div className="h-8" />
      </div>

      <NotificationDetailModal
        notification={detailNotification}
        onClose={() => setDetailNotification(null)}
      />
    </div>
    </MainLayout>
  );
}
