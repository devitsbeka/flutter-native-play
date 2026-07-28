import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import logger from '@/utils/logger';

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

// Cache for country code to avoid repeated API calls
let cachedCountryCode: string | null = null;
let countryCodeFetched = false;

// Get country code - use timezone detection only (no external API to avoid CORS issues)
const getCountryCode = (): string | null => {
  if (countryCodeFetched) return cachedCountryCode;
  
  cachedCountryCode = detectCountryFromTimezone();
  countryCodeFetched = true;
  return cachedCountryCode;
};

// Fallback: detect country from timezone
const detectCountryFromTimezone = (): string | null => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const countryMap: Record<string, string> = {
      'Europe/Tbilisi': 'ge',
      'Asia/Tbilisi': 'ge',
      'America/New_York': 'us',
      'America/Los_Angeles': 'us',
      'America/Chicago': 'us',
      'Europe/London': 'gb',
      'Europe/Berlin': 'de',
      'Europe/Paris': 'fr',
      'Europe/Moscow': 'ge',
      'Asia/Tokyo': 'jp',
      'Asia/Seoul': 'kr',
      'Asia/Shanghai': 'cn',
      'Europe/Kiev': 'ua',
      'Europe/Kyiv': 'ua',
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

/**
 * useUserPresence - Tracks user presence for both authenticated and guest users
 * 
 * Key improvements:
 * - Session validation before requests
 * - Silent failures (no console spam)
 * - Reduced heartbeat to 60s
 * - Proper cleanup
 */
export const useUserPresence = () => {
  const { user, session } = useAuth();
  const location = useLocation();
  const heartbeatInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countryCodeRef = useRef<string | null>(null);
  const isUpdatingRef = useRef(false);
  const currentRoomIdRef = useRef<string | null>(null);
  const pathnameRef = useRef(location.pathname);
  const trackedPresenceIdRef = useRef<string | null>(null);
  pathnameRef.current = location.pathname;

  // Check if we can make authenticated requests
  const canMakeRequest = useCallback((): boolean => {
    // For authenticated users, check session validity
    if (user?.id && session?.access_token) {
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiryTime = expiresAt * 1000;
        const now = Date.now();
        const buffer = 60 * 1000;
        if (now >= expiryTime - buffer) {
          return false;
        }
      }
      return true;
    }
    // For guests, always allow (uses anon key)
    return true;
  }, [user?.id, session]);

  const updatePresence = useCallback(async (status: 'online' | 'away' | 'offline', currentPage?: string) => {
    if (!canMakeRequest() || isUpdatingRef.current) return;
    
    const userId = user?.id || getGuestSessionId();
    const countryCode = countryCodeRef.current;

    isUpdatingRef.current = true;

    try {
      // Use room-specific path if user is in a room
      const pagePath = currentRoomIdRef.current
        ? `/room/${currentRoomIdRef.current}`
        : (currentPage || pathnameRef.current);

      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          status,
          current_page: pagePath,
          last_seen: new Date().toISOString(),
          country_code: countryCode,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        // Silent fail - don't spam console
        logger.debug('Presence update failed:', error.message);
      } else {
        trackedPresenceIdRef.current = userId;
      }
    } catch {
      // Silent fail
    } finally {
      isUpdatingRef.current = false;
    }
  }, [user?.id, canMakeRequest]);

  // Re-link presence when auth identity changes (guest → authenticated)
  useEffect(() => {
    if (!user?.id) return;
    const oldId = trackedPresenceIdRef.current;
    if (oldId && oldId !== user.id && oldId.startsWith('guest_')) {
      // Delete old guest presence row, then create authenticated one
      supabase
        .from('user_presence')
        .delete()
        .eq('user_id', oldId)
        .then(() => {
          trackedPresenceIdRef.current = user.id;
          updatePresence('online');
          logger.debug('Presence identity merged:', oldId, '→', user.id);
        });
    }
  }, [user?.id, updatePresence]);

  // Set room-specific presence (called when entering/exiting a room)
  const setRoomPresence = useCallback(async (roomId: string | null) => {
    currentRoomIdRef.current = roomId;
    
    if (!canMakeRequest() || isUpdatingRef.current) return;
    
    const userId = user?.id || getGuestSessionId();
    isUpdatingRef.current = true;

    try {
      const pagePath = roomId ? `/room/${roomId}` : pathnameRef.current;

      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          status: 'online',
          current_page: pagePath,
          last_seen: new Date().toISOString(),
          country_code: countryCodeRef.current,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        logger.debug('Room presence update failed:', error.message);
      }
    } catch {
      // Silent fail
    } finally {
      isUpdatingRef.current = false;
    }
  }, [user?.id, canMakeRequest]);

  useEffect(() => {
    // Get country code synchronously, then start presence tracking
    const countryCode = getCountryCode();
    countryCodeRef.current = countryCode;
    
    // Set initial online status with country
    updatePresence('online', location.pathname);

    // Heartbeat every 60 seconds (reduced from 30s)
    heartbeatInterval.current = setInterval(() => {
      if (canMakeRequest()) {
        updatePresence('online');
      }
    }, 60000);

    // Handle tab visibility
    const handleVisibilityChange = () => {
      if (!canMakeRequest()) return;
      
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    // Handle before unload - simplified, just try to update
    // The server-side timeout will handle cases where this fails
    const handleBeforeUnload = () => {
      // Don't use sendBeacon - it can't authenticate properly
      // Server-side will mark users as offline after timeout
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
  }, [user?.id, updatePresence, canMakeRequest]);

  // Update page on route change (but respect room override)
  useEffect(() => {
    if (canMakeRequest() && !currentRoomIdRef.current) {
      updatePresence('online', location.pathname);
    }
  }, [location.pathname, updatePresence, canMakeRequest]);

  return { updatePresence, setRoomPresence };
};
