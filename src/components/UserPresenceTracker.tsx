import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const UserPresenceTracker = () => {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const updatePresence = async (status: 'online' | 'away' | 'offline') => {
      try {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: user.id,
            status,
            current_page: location.pathname,
            last_seen: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Set online when component mounts
    updatePresence('online');

    // Update presence every 30 seconds (heartbeat)
    const heartbeat = setInterval(() => {
      updatePresence('online');
    }, 30000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      } else {
        updatePresence('away');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle before unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline status
      const data = JSON.stringify({
        user_id: user.id,
        status: 'offline',
        last_seen: new Date().toISOString(),
      });
      navigator.sendBeacon?.(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?on_conflict=user_id`, data);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence('offline');
    };
  }, [user, location.pathname]);

  // Update page when route changes
  useEffect(() => {
    if (!user) return;

    const updatePage = async () => {
      try {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: user.id,
            status: 'online',
            current_page: location.pathname,
            last_seen: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });
      } catch (error) {
        console.error('Error updating page:', error);
      }
    };
    updatePage();
  }, [location.pathname, user]);

  return null;
};
