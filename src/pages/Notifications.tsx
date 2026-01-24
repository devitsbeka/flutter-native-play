import { useMemo, useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, ChevronDown, Trash2, X } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useGenerationNotifications } from '@/hooks/useGenerationNotifications';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFriends } from '@/hooks/useFriends';
import { useGameInvitations } from '@/hooks/useGameInvitations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { CompactNotificationCard } from '@/components/notifications/CompactNotificationCard';
import { CompactGenerationCard } from '@/components/notifications/CompactGenerationCard';
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
  const { language } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();
  const { generationNotifications, hasActiveGenerations } = useGenerationNotifications();
  const { acceptFriendRequest, declineFriendRequest } = useFriends();
  const { acceptInvitation, declineInvitation } = useGameInvitations();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [clearingAll, setClearingAll] = useState(false);

  const dateLocale = language === 'ka' ? ka : enUS;

  // Mark all as read when page loads
  useEffect(() => {
    // unreadCount can be 0 on first mount while notifications are still loading.
    // Re-run when unreadCount changes so unread badge doesn't get stuck.
    if (unreadCount > 0 && !loading) {
      markAllAsRead();
    }
  }, [unreadCount, loading, markAllAsRead]);

  const displayedNotifications = notifications.slice(0, displayLimit);
  const hasMore = notifications.length > displayLimit;
  const hasAnyContent = generationNotifications.length > 0 || notifications.length > 0;

  const sectionedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    const getSectionTitle = (type: Notification['type']) => {
      switch (type) {
        case 'friend_request':
        case 'friend_accepted':
          return 'მეგობრები';
        case 'room_invite':
        case 'game_started':
        case 'challenge':
        case 'game_result':
          return 'თამაშები';
        case 'trivia_liked':
        case 'trivia_saved':
        case 'trivia_played':
          return 'ტრივია';
        case 'reward':
        case 'daily_reward':
        case 'streak':
        case 'level_up':
        case 'achievement':
          return 'პროგრესი';
        case 'billing':
        case 'subscription':
          return 'გადახდები';
        default:
          return 'სხვა';
      }
    };

    for (const n of displayedNotifications) {
      const title = getSectionTitle(n.type);
      if (!groups[title]) groups[title] = [];
      groups[title].push(n);
    }

    // stable ordering
    const order = ['მეგობრები', 'თამაშები', 'ტრივია', 'პროგრესი', 'გადახდები', 'სხვა'];
    return order
      .filter((k) => (groups[k]?.length ?? 0) > 0)
      .map((k) => ({ title: k, items: groups[k] }));
  }, [displayedNotifications]);

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
            toast.error('ვერ მოხერხდა თამაშზე გადასვლა');
            navigate('/team');
          }
        })();
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

      {/* Header - reduced size */}
      <div className="relative z-10 px-4 pt-4 pb-3 border-b border-border/40">
        <div className="flex items-center justify-between mb-2 max-w-[700px] md:max-w-[600px] mx-auto w-full">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <h1 className="font-bold text-base text-foreground">აქტივობა</h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>
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
              შეტყობინებები არ არის
            </p>
          </div>
        ) : (
          <div className="bg-card/60 backdrop-blur-sm rounded-none overflow-hidden pb-2">
            {/* Generation Notifications */}
            {generationNotifications.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-background/40 border-b border-border/30">
                  AI გენერაცია
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

            {/* Regular Notifications */}
            <AnimatePresence mode="popLayout">
              {sectionedNotifications.map((section) => (
                <div
                  key={section.title}
                  className="border-t border-border/30 first:border-t-0"
                >
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-background/40 border-b border-border/30">
                    {section.title}
                  </div>
                  {section.items.map((notification) => (
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
                        locale: dateLocale,
                      })}
                    />
                  ))}
                </div>
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
                მეტის ნახვა
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
                    ყველას წაშლა
                  </motion.button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>ყველა შეტყობინების წაშლა</AlertDialogTitle>
                    <AlertDialogDescription>
                      დარწმუნებული ხართ? ეს მოქმედება შეუქცევადია.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>გაუქმება</AlertDialogCancel>
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

        <div className="h-8" />
      </div>
    </div>
    </MainLayout>
  );
}
