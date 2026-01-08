import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Generate or get a persistent guest session ID
const getGuestSessionId = (): string => {
  const storageKey = 'guest_session_id';
  let sessionId = localStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = `guest_${crypto.randomUUID()}`;
    localStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
};

// Try to detect country from timezone
const detectCountryFromTimezone = (): string | null => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const countryMap: Record<string, string> = {
      'Europe/Tbilisi': 'ge',
      'America/New_York': 'us',
      'America/Los_Angeles': 'us',
      'America/Chicago': 'us',
      'Europe/London': 'gb',
      'Europe/Berlin': 'de',
      'Europe/Paris': 'fr',
      'Europe/Moscow': 'ru',
      'Asia/Tokyo': 'jp',
      'Asia/Seoul': 'kr',
      'Asia/Shanghai': 'cn',
      'Europe/Kiev': 'ua',
      'Europe/Istanbul': 'tr',
      'Asia/Dubai': 'ae',
      'Europe/Rome': 'it',
      'Europe/Madrid': 'es',
      'America/Sao_Paulo': 'br',
      'Asia/Kolkata': 'in',
      'Australia/Sydney': 'au',
    };
    return countryMap[timezone] || null;
  } catch {
    return null;
  }
};

export const useUserPresence = () => {
  const { user } = useAuth();
  const location = useLocation();
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline', currentPage?: string) => {
    // For authenticated users, use their user.id
    // For guests, use a persistent session ID
    const userId = user?.id || getGuestSessionId();
    const countryCode = detectCountryFromTimezone();

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          status,
          current_page: currentPage || location.pathname,
          last_seen: new Date().toISOString(),
          country_code: countryCode,
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
    // Track both authenticated and guest users
    const userId = user?.id || getGuestSessionId();

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
      const countryCode = detectCountryFromTimezone();
      const data = JSON.stringify({
        user_id: userId,
        status: 'offline',
        last_seen: new Date().toISOString(),
        country_code: countryCode,
      });
      navigator.sendBeacon(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${userId}`,
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
    updatePresence('online', location.pathname);
  }, [location.pathname, updatePresence]);

  return { updatePresence };
};