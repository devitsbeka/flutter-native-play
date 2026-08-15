import { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSound } from '@/contexts/SoundContext';
import { translateNotificationTitle } from '@/utils/notificationTranslations';
import { t as tStandalone } from '@/utils/standaloneTranslation';

export type NotificationType =
  | 'new_message'
  | 'friend_request'
  | 'friend_accepted'
  | 'challenge'
  | 'game_started'
  | 'room_invite'
  | 'game_result'
  | 'reward'
  | 'daily_reward'
  | 'streak'
  | 'level_up'
  | 'achievement'
  | 'trivia_liked'
  | 'trivia_saved'
  | 'trivia_played'
  | 'billing'
  | 'subscription'
  | 'system'
  | 'welcome'
  | 'ai_generation'
  | 'room_ping';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  /** Omit `ids` to clear the whole account; pass them to clear one tab. */
  clearAllNotifications: (ids?: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { playSound } = useSound();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch (error) {
      console.error('[Notifications] Error fetching:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Single global realtime subscription
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      setIsConnected(false);
      return;
    }

    fetchNotifications();

    // SINGLE global channel for the entire app
    const channel = supabase
      .channel(`notifications-global-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          playSound('notification');
          // A room ping is a call to action right now — surface it as a
          // clickable popup that drops the host straight into the room
          if (newNotification.type === 'room_ping') {
            const roomCode = (newNotification.data as Record<string, unknown>)?.room_code as string | undefined;
            toast(
              translateNotificationTitle('room_ping', newNotification.title, newNotification.data),
              {
                duration: 10000,
                action: roomCode
                  ? {
                      label: tStandalone('extra.pingHostOpenRoom'),
                      onClick: () => navigate(`/team?join=${roomCode}`),
                    }
                  : undefined,
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
        }
      )
      .subscribe((status) => {
        // Monitor subscription status for connection health
        if (status === 'SUBSCRIBED') {
          // Realtime connected
          setIsConnected(true);
          // Refetch to catch any events that occurred during connection
          fetchNotifications();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Channel error or timeout
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [user, fetchNotifications, playSound, navigate]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error('[Notifications] Error marking as read:', error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('[Notifications] Error marking all as read:', error);
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('[Notifications] Error deleting notification:', error);
    }
  }, [user]);

  /**
   * Delete notifications, optionally only the ones in `ids`.
   *
   * The button that calls this sits under a tab, beneath that tab's list, and
   * said "delete all" — and deleted every notification the account had,
   * including the two tabs the player was not looking at. Passing the ids the
   * tab is showing makes it mean what it looks like it means; passing nothing
   * keeps the old whole-account behaviour for any caller that wants it.
   */
  const clearAllNotifications = useCallback(async (ids?: string[]) => {
    if (!user) return;
    if (ids && ids.length === 0) return;

    try {
      const query = supabase.from('notifications').delete().eq('user_id', user.id);
      const { error } = ids ? await query.in('id', ids) : await query;

      if (error) throw error;

      setNotifications((prev) => (ids ? prev.filter((n) => !ids.includes(n.id)) : []));
    } catch (error) {
      console.error('[Notifications] Error clearing all:', error);
      throw error;
    }
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      isConnected,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      refresh: fetchNotifications,
    }),
    [
      notifications,
      unreadCount,
      loading,
      isConnected,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      fetchNotifications,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
