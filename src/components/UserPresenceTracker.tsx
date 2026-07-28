import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import logger from '@/utils/logger';

/**
 * UserPresenceTracker - Tracks authenticated user presence
 * 
 * Key improvements:
 * - Only tracks authenticated users (prevents 401 errors)
 * - Uses session validation before making requests
 * - Proper sendBeacon with auth headers
 * - Reduced heartbeat frequency to minimize requests
 * - Silent failures to prevent console spam
 */
export const UserPresenceTracker = () => {
  const { user, session } = useAuth();
  const location = useLocation();
  const heartbeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingRef = useRef(false);

  // Session tracking for analytics (separate from presence)
  useSessionTracker();

  // Validate session before making presence calls
  const isSessionValid = useCallback((): boolean => {
    if (!session?.access_token) return false;
    
    // Check if token is expired (with 60s buffer)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiryTime = expiresAt * 1000; // Convert to ms
      const now = Date.now();
      const buffer = 60 * 1000; // 60 seconds buffer
      if (now >= expiryTime - buffer) {
        return false;
      }
    }
    return true;
  }, [session]);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline') => {
    // Guard: Only update for authenticated users with valid session
    if (!user?.id || !isSessionValid()) {
      return;
    }

    // Prevent concurrent updates
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status,
          current_page: location.pathname,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        // Silent fail - don't spam console
        logger.debug('Presence update failed:', error.message);
      }
    } catch {
      // Silent fail
    } finally {
      isUpdatingRef.current = false;
    }
  }, [user?.id, location.pathname, isSessionValid]);

  useEffect(() => {
    // Guard: Only track authenticated users
    if (!user?.id || !session?.access_token) {
      return;
    }

    // Set online when component mounts
    updatePresence('online');

    // Heartbeat every 60 seconds (reduced from 30s to minimize requests)
    heartbeatRef.current = setInterval(() => {
      if (isSessionValid()) {
        updatePresence('online');
      }
    }, 60000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (!isSessionValid()) return;
      
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      } else {
        updatePresence('away');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle before unload - don't use sendBeacon as it can't authenticate properly
    // Server-side will mark users as offline after timeout (last_seen check)
    const handleBeforeUnload = () => {
      // Best effort offline update - may not complete before page unloads
      if (session?.access_token && user?.id) {
        updatePresence('offline');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Try to set offline on unmount (best effort)
      updatePresence('offline');
    };
  }, [user?.id, session?.access_token, updatePresence, isSessionValid]);

  // Update page when route changes
  useEffect(() => {
    if (!user?.id || !isSessionValid()) return;
    updatePresence('online');
  }, [location.pathname, user?.id, updatePresence, isSessionValid]);

  return null;
};
