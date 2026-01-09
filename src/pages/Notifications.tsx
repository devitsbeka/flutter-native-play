import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BellOff, CheckCheck, Check, Trash2 } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ka } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { UniversalBottomNav } from '@/components/layout/UniversalBottomNav';
import { Button } from '@/components/ui/button';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { NOTIFICATION_FILTER_CATEGORIES } from '@/config/notificationConfig';

type FilterType = 'all' | 'unread' | 'friends' | 'games' | 'rewards';

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
  t,
  dateLocale,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notification: Notification) => void;
  t: (key: string) => string;
  dateLocale: typeof ka;
}) {
  const isUnread = !notification.read_at;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
    addSuffix: true,
    locale: dateLocale 
  });


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={cn(
        "relative p-4 rounded-2xl border transition-all cursor-pointer",
        isUnread
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
          : "bg-card/50 border-border/50 hover:bg-card/80"
      )}
      onClick={() => {
        if (isUnread) {
          onMarkRead(notification.id);
        }
        onNavigate(notification);
      }}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <NotificationBadge type={notification.type} size="lg" />

        {/* Content */}
        <div className="flex-1 min-w-0 pr-8">
          <p className={cn(
            "font-bold text-sm line-clamp-1",
            isUnread ? "text-foreground" : "text-muted-foreground"
          )}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-2">
            {timeAgo}
          </p>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/30">
        {isUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="h-8 px-3 text-xs gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {t('notifications.markAsRead')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="h-8 px-3 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('notifications.delete')}
        </Button>
      </div>
    </motion.div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');

  const dateLocale = language === 'ka' ? ka : enUS;

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

  const handleNavigate = (notification: Notification) => {
    const data = notification.data as Record<string, unknown>;
    
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
    { key: 'all', label: t('notifications.all') },
    { key: 'unread', label: t('notifications.unread') },
    { key: 'friends', label: t('notifications.social') || 'სოციალური' },
    { key: 'games', label: t('notifications.games') },
    { key: 'rewards', label: t('notifications.rewards') || 'ჯილდოები' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">{t('notifications.title')}</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount} {t('notifications.unread').toLowerCase()}
              </p>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
          {filters.map((f) => (
            <Button
              key={f.key}
              onClick={() => setFilter(f.key)}
              variant={filter === f.key ? "default" : "secondary"}
              size="sm"
              className="rounded-full flex-shrink-0"
            >
              {f.label}
              {f.key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
                  {unreadCount}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Mark all as read button - moved here */}
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={markAllAsRead}
            className="w-full gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            {t('notifications.markAllAsRead')}
          </Button>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-12">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground mt-4">{t('notifications.loading')}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <BellOff className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-2">{t('notifications.noNotifications')}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[280px]">
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
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
                onNavigate={handleNavigate}
                t={t}
                dateLocale={dateLocale}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <UniversalBottomNav />
    </div>
  );
}
