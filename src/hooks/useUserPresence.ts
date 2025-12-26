import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserPresence = () => {
  const { user } = useAuth();
  const location = useLocation();
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline', currentPage?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status,
          current_page: currentPage || location.pathname,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error updating presence:', error);
      }
    } catch (err) {
      console.error('Presence update failed:', err);
    }
  }, [user, location.pathname]);

  // Set online on mount and update page
  useEffect(() => {
    if (!user) return;

    // Set initial online status
    updatePresence('online', location.pathname);

    // Heartbeat every 30 seconds
    heartbeatInterval.current = setInterval(() => {
      updatePresence('online', location.pathname);
    }, 30000);

    // Handle tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online', location.pathname);
      }
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status
      const data = JSON.stringify({
        user_id: user.id,
        status: 'offline',
        last_seen: new Date().toISOString(),
      });
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}`,
        data
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence('offline');
    };
  }, [user, updatePresence, location.pathname]);

  // Update page on route change
  useEffect(() => {
    if (user) {
      updatePresence('online', location.pathname);
    }
  }, [location.pathname, user, updatePresence]);

  return { updatePresence };
};
