import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OnlineUser {
  id: string;
  user_id: string;
  status: 'online' | 'away' | 'offline';
  current_page: string | null;
  last_seen: string;
  profile?: {
    nickname: string;
    avatar_url: string | null;
    country_code: string | null;
  };
}

export const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      // Get users seen in last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { data: presenceData, error: presenceError } = await supabase
        .from('user_presence')
        .select('*')
        .gte('last_seen', twoMinutesAgo)
        .neq('status', 'offline');

      if (presenceError) throw presenceError;

      if (!presenceData || presenceData.length === 0) {
        setOnlineUsers([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for these users
      const userIds = presenceData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url, country_code')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      const usersWithProfiles: OnlineUser[] = presenceData.map(presence => ({
        ...presence,
        status: presence.status as 'online' | 'away' | 'offline',
        profile: profilesMap.get(presence.user_id) || undefined,
      }));

      setOnlineUsers(usersWithProfiles);
    } catch (err) {
      console.error('Error fetching online users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOnlineUsers();
  }, [fetchOnlineUsers]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('online-users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe();

    // Also poll every 30 seconds to catch stale users
    const pollInterval = setInterval(fetchOnlineUsers, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchOnlineUsers]);

  const onlineCount = onlineUsers.filter(u => u.status === 'online').length;
  const awayCount = onlineUsers.filter(u => u.status === 'away').length;

  return {
    onlineUsers,
    loading,
    onlineCount,
    awayCount,
    totalActive: onlineCount + awayCount,
    refetch: fetchOnlineUsers,
  };
};
