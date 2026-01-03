import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Check, CheckCheck, Users, Swords, Gift, Trophy, Info, Trash2 } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'unread' | 'friends' | 'games';

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  friend_request: <Users className="w-5 h-5 text-blue-400" />,
  friend_accepted: <Users className="w-5 h-5 text-green-400" />,
  challenge: <Swords className="w-5 h-5 text-orange-400" />,
  game_result: <Trophy className="w-5 h-5 text-yellow-400" />,
  reward: <Gift className="w-5 h-5 text-pink-400" />,
  achievement: <Trophy className="w-5 h-5 text-purple-400" />,
  system: <Info className="w-5 h-5 text-muted-foreground" />,
};

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notification: Notification) => void;
}) {
  const isUnread = !notification.read_at;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "relative p-4 rounded-xl border transition-all cursor-pointer group",
        isUnread
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
          : "bg-secondary/50 border-border/50 hover:bg-secondary"
      )}
      onClick={() => {
        if (isUnread) onMarkRead(notification.id);
        onNavigate(notification);
      }}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background/50 flex items-center justify-center">
          {NOTIFICATION_ICONS[notification.type] || <Bell className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium text-sm line-clamp-1",
            isUnread ? "text-foreground" : "text-muted-foreground"
          )}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1">
            {timeAgo}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
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
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredNotifications = notifications.filter((n) => {
    switch (filter) {
      case 'unread':
        return !n.read_at;
      case 'friends':
        return n.type === 'friend_request' || n.type === 'friend_accepted';
      case 'games':
        return n.type === 'challenge' || n.type === 'game_result';
      default:
        return true;
    }
  });

  const handleNavigate = (notification: Notification) => {
    // Navigate based on notification type
    switch (notification.type) {
      case 'friend_request':
      case 'friend_accepted':
        navigate('/team');
        break;
      case 'challenge':
      case 'game_result':
        if (notification.data?.room_id) {
          navigate('/team');
        } else {
          navigate('/team');
        }
        break;
      case 'reward':
        // Stay on home, maybe open rewards modal
        break;
      case 'achievement':
        navigate('/profile');
        break;
      default:
        break;
    }
    onClose();
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'friends', label: 'Friends' },
    { key: 'games', label: 'Games' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-3xl bg-card border-t border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border/50">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Notifications</h2>
                    {unreadCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {unreadCount} unread
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
                {filters.map((f) => (
                  <motion.button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all flex-shrink-0"
                    style={{
                      background: filter === f.key
                        ? "linear-gradient(135deg, hsl(263 70% 55%) 0%, hsl(280 65% 50%) 100%)"
                        : "hsl(var(--muted))",
                      color: filter === f.key ? "white" : "hsl(var(--muted-foreground))",
                      boxShadow: filter === f.key
                        ? "0 4px 0 hsl(263 60% 40%), inset 0 1px 0 hsl(0 0% 100% / 0.2)"
                        : "0 2px 0 hsl(var(--border))",
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {f.label}
                    {f.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                        {unreadCount}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex flex-col items-center pt-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground mt-3">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center pt-8">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <BellOff className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground mb-2">No notifications</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-[250px]">
                    {filter === 'unread'
                      ? "You're all caught up!"
                      : filter === 'friends'
                      ? "No friend activity yet"
                      : filter === 'games'
                      ? "No game notifications"
                      : "When something happens, you'll see it here"}
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
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Bottom safe area */}
            <div className="h-6 bg-card" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
