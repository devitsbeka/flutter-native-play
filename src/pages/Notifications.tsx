import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, ChevronDown, Trash2, X } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { NotificationTabs } from '@/components/notifications/NotificationTabs';
import { useGenerationNotifications } from '@/hooks/useGenerationNotifications';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { cn } from '@/lib/utils';
import { ka } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { toast } from "@/lib/toast";
import { shortTimeAgo } from '@/utils/shortTimeAgo';
import { typeInTab, type NotificationTab } from '@/config/notificationTabs';
import { CompactNotificationCard } from '@/components/notifications/CompactNotificationCard';
import { NotificationDetailModal } from '@/components/notifications/NotificationDetailModal';
import { CompactGenerationCard } from '@/components/notifications/CompactGenerationCard';
import { PageHeader } from "@/components/shared/PageHeader";
import { PingPongVideo } from '@/components/shared/PingPongVideo';
import { MAP_VIDEOS } from '@/config/videoConfig';
import { routeForRoom, ROOM_KIND_COLUMNS } from "@/utils/roomRoutes";
import { supabase } from '@/integrations/supabase/client';
import { PUBLIC_SHARING_ENABLED } from "@/config/features";
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

/**
 * Set while this screen is unmounting and cleared if it mounts straight back
 * up. Module scope because the two mounts are different component instances —
 * see the effect that uses it.
 */
let pendingLeaveRead: ReturnType<typeof setTimeout> | null = null;

export default function Notifications() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, markManyAsRead, deleteNotification, clearAllNotifications } = useNotifications();
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

  // Reading happens on the way OUT, not half a second after the way in.
  //
  // This screen used to mark everything read 500ms after it opened, which
  // cleared the per-tab counts while the player was still looking at them —
  // a row would be sitting there unread one moment and plain the next,
  // without them having touched it.
  //
  // It still ends up all read, because the bell counts every unread
  // notification and leaving one tab unclearable would keep the bell lit
  // after the player had, as far as they are concerned, looked. What changed
  // is when: the tab you leave clears as you leave it, and anything still
  // unread clears when you close the screen. Tapping a row clears that row
  // immediately, as it always did.
  const latest = useRef({ notifications, markAllAsRead, markManyAsRead });
  latest.current = { notifications, markAllAsRead, markManyAsRead };

  const leaveTab = useCallback((tab: NotificationTab) => {
    const ids = latest.current.notifications
      .filter((n) => typeInTab(n.type, tab) && !n.read_at)
      .map((n) => n.id);
    void latest.current.markManyAsRead(ids);
    // typeInTab is a module import, not state — listing it is an unnecessary
    // dependency, and everything else is read through the ref.
  }, []);

  const handleTabChange = useCallback((next: NotificationTab) => {
    if (next === activeTab) return;
    leaveTab(activeTab);
    setActiveTab(next);
  }, [activeTab, leaveTab]);

  // Closing the screen reads whatever is left, including the tab never opened.
  //
  // Deferred by a tick and cancelled on re-mount, because StrictMode runs
  // every effect mount -> cleanup -> mount in development. A cleanup that
  // marked everything read immediately would therefore fire a beat after this
  // screen opened — which is precisely the behaviour being removed, and it
  // would only misbehave in dev, where it gets tested.
  useEffect(() => {
    if (pendingLeaveRead !== null) {
      clearTimeout(pendingLeaveRead);
      pendingLeaveRead = null;
    }
    return () => {
      pendingLeaveRead = setTimeout(() => {
        pendingLeaveRead = null;
        void latest.current.markAllAsRead();
      }, 0);
    };
  }, []);

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
        // The room decides its page (routeForRoom) — a Words or lounge
        // invite is not a classic room.
        const { data: typed } = await supabase
          .from('game_rooms')
          .select(ROOM_KIND_COLUMNS)
          .eq('room_code', roomCode.toUpperCase())
          .maybeSingle();
        navigate(routeForRoom(typed, roomCode));
      } else {
        // Accepted, but the room can no longer be joined (deleted or
        // codeless). Saying nothing left the player staring at the list
        // wondering whether the tap worked.
        toast.error(t("extra.mpRoomNotFound"));
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
              const q = supabase.from('game_rooms').select('tv_session_id, room_code, game_type_key, game_mode');
              const { data: room } = roomId
                ? await q.eq('id', roomId).maybeSingle()
                : await q.eq('room_code', String(roomCode).toUpperCase()).maybeSingle();

              if (room?.tv_session_id) {
                navigate(`/join/session/${room.tv_session_id}`);
                return;
              }

              if (room?.room_code) {
                // A lounge invite lands in its lounge — /team?join= would
                // seat the player in a room its page never shows.
                navigate(routeForRoom(room));
                return;
              }
            }

            if (roomCode) {
              navigate(`/team?join=${roomCode}`);
            } else {
              // No room to go to — say so instead of quietly landing the
              // player on the games tab as if the tap meant nothing.
              toast.error(t("extra.mpRoomNotFound"));
              navigate('/team');
            }
          } catch {
            toast.error(t("extra.notifCouldNotNavigate"));
            navigate('/team');
          }
        })();
        break;
      case 'friend_request':
      case 'friend_accepted': {
        // The notification is about a person — open that person, not the
        // games tab.
        const senderId = data?.sender_id as string | undefined;
        if (senderId) {
          navigate(`/profile/${senderId}`);
        } else {
          setDetailNotification(notification);
        }
        break;
      }
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
      case 'new_levels': {
        // The push deep-links to the category; the in-app row should too.
        const cats = data?.categories as { categoryId?: string }[] | undefined;
        const catId = cats?.[0]?.categoryId;
        if (catId) {
          navigate(`/category/${catId}`);
        } else {
          setDetailNotification(notification);
        }
        break;
      }
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
    <div className="min-h-full pb-8 relative">
      {/* Video Background */}
      <div className="fixed inset-0">
        <PingPongVideo src={MAP_VIDEOS.default} className="opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/80" />
      </div>

      {/* The shared header. The bell that used to sit beside the title is
          gone with it — the page is the notifications list, so an icon
          repeating that said nothing the title did not. */}
      <PageHeader title={t("extra.notifActivity")} className="z-20" />

      {/* Tabs. Sticky offset is 76px — the PageHeader's height only. This
          page scrolls inside MainLayout, whose scroller already starts below
          the safe area, so adding var(--safe-top) here double-counts the
          inset: sticky then pushes the strip 59px BELOW its flow position at
          rest, which read as an empty band between header and content on
          device (and never on web, where --safe-top is 0). */}
      <div className="sticky top-[76px] z-10 bg-background/95 backdrop-blur-md px-4 pt-3 pb-3 max-w-[700px] md:max-w-[600px] mx-auto">
        <NotificationTabs
          activeTab={activeTab}
          onTabChange={(tab) => handleTabChange(tab)}
          unreadCount={getUnreadCount}
          labels={{
            games: t("extra.notifGamesTab"),
            social: t("extra.notifSocialTab"),
            trivia: t("extra.notifTriviaTab"),
          }}
        />
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
