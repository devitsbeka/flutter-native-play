import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveUser {
  id: string;
  user_id: string;
  status: 'online' | 'away' | 'offline';
  current_page: string | null;
  last_seen: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
  region: string | null;
  isGuest: boolean;
}

export const useActiveUsers = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveUsers = useCallback(async () => {
    try {
      // Get users seen in last 24 hours
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: presenceData, error: presenceError } = await supabase
        .from('user_presence')
        .select('*')
        .gte('last_seen', dayAgo)
        .order('last_seen', { ascending: false });

      if (presenceError) throw presenceError;

      if (!presenceData || presenceData.length === 0) {
        setActiveUsers([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for these users
      const userIds = presenceData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url, country_code, region')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      const usersWithProfiles: ActiveUser[] = presenceData.map(presence => {
        const profile = profilesMap.get(presence.user_id);
        const isGuest = !profile;
        // Generate short unique ID from user_id for guests
        const guestId = presence.user_id.slice(0, 6).toUpperCase();
        
        return {
          id: presence.id,
          user_id: presence.user_id,
          status: presence.status as 'online' | 'away' | 'offline',
          current_page: presence.current_page,
          last_seen: presence.last_seen,
          nickname: profile?.nickname || `სტუმარი #${guestId}`,
          avatar_url: profile?.avatar_url || null,
          // Use presence country_code for guests, or profile data for registered users
          country_code: profile?.country_code || (presence as any).country_code || null,
          region: profile?.region || (presence as any).region || null,
          isGuest,
        };
      });

      setActiveUsers(usersWithProfiles);
    } catch (err) {
      console.error('Error fetching active users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchActiveUsers();
  }, [fetchActiveUsers]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('active-users-globe')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        () => {
          fetchActiveUsers();
        }
      )
      .subscribe();

    // Poll every 30 seconds
    const pollInterval = setInterval(fetchActiveUsers, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchActiveUsers]);

  // Computed values
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const onlineUsers = activeUsers.filter(u => 
    u.status === 'online' && u.last_seen >= twoMinutesAgo
  );
  const recentlyActiveUsers = activeUsers.filter(u => 
    !(u.status === 'online' && u.last_seen >= twoMinutesAgo)
  );

  return {
    activeUsers,
    onlineUsers,
    recentlyActiveUsers,
    loading,
    refetch: fetchActiveUsers,
  };
};
