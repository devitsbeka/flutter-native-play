import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { parseUserAgent } from '@/utils/userAgentParser';
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

/**
 * useSessionTracker - Records session-level analytics into `user_sessions`
 * 
 * Separated from useUserPresence to keep concerns clean:
 * - useUserPresence: real-time status (online/away/offline) + heartbeat
 * - useSessionTracker: session lifecycle (start → navigate → end)
 */
export const useSessionTracker = () => {
  const { user } = useAuth();
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const pagesVisitedRef = useRef<number>(1);
  const entryPageRef = useRef<string>(location.pathname);
  const exitPageRef = useRef<string>(location.pathname);
  const isEndingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const trackedUserIdRef = useRef<string | null>(null);

  const getUserId = useCallback(() => {
    return user?.id || getGuestSessionId();
  }, [user?.id]);

  // Get country code from existing presence logic
  const getCountryCode = useCallback((): string | null => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const countryMap: Record<string, string> = {
        'Europe/Tbilisi': 'ge', 'Asia/Tbilisi': 'ge',
        'America/New_York': 'us', 'America/Los_Angeles': 'us', 'America/Chicago': 'us',
        'Europe/London': 'gb', 'Europe/Berlin': 'de', 'Europe/Paris': 'fr',
        'Europe/Moscow': 'ru', 'Asia/Tokyo': 'jp', 'Asia/Seoul': 'kr',
        'Asia/Shanghai': 'cn', 'Europe/Kiev': 'ua', 'Europe/Kyiv': 'ua',
        'Europe/Istanbul': 'tr', 'Asia/Dubai': 'ae', 'Europe/Rome': 'it',
        'Europe/Madrid': 'es', 'America/Sao_Paulo': 'br', 'Asia/Kolkata': 'in',
        'Australia/Sydney': 'au',
      };
      return countryMap[timezone] || null;
    } catch {
      return null;
    }
  }, []);

  // Start a new session
  const startSession = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const userId = getUserId();
    trackedUserIdRef.current = userId;
    const ua = parseUserAgent();
    const countryCode = getCountryCode();
    const now = new Date().toISOString();

    sessionStartRef.current = Date.now();
    pagesVisitedRef.current = 1;
    entryPageRef.current = location.pathname;
    exitPageRef.current = location.pathname;

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_start: now,
          browser: ua.browser,
          os: ua.os,
          device_type: ua.deviceType,
          screen_width: window.screen.width,
          screen_height: window.screen.height,
          entry_page: location.pathname,
          exit_page: location.pathname,
          pages_visited: 1,
          country_code: countryCode,
        })
        .select('id')
        .single();

      if (error) {
        logger.debug('Session start failed:', error.message);
        return;
      }

      sessionIdRef.current = data.id;
      logger.debug('Session started:', data.id, 'as', userId);
    } catch {
      // Silent fail
    }
  }, [getUserId, getCountryCode, location.pathname]);

  // Re-link session when auth identity changes (guest → authenticated)
  useEffect(() => {
    if (!user?.id || !sessionIdRef.current) return;
    // If session was started under a guest ID, update it to the real user
    if (trackedUserIdRef.current && trackedUserIdRef.current !== user.id) {
      const oldId = trackedUserIdRef.current;
      trackedUserIdRef.current = user.id;
      
      supabase
        .from('user_sessions')
        .update({ user_id: user.id })
        .eq('id', sessionIdRef.current)
        .then(({ error }) => {
          if (error) {
            logger.debug('Session identity merge failed:', error.message);
          } else {
            logger.debug('Session identity merged:', oldId, '→', user.id);
          }
        });
    }
  }, [user?.id]);

  // End the current session
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current || isEndingRef.current) return;
    isEndingRef.current = true;

    const durationSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const isBounce = durationSeconds < 10;

    try {
      await supabase
        .from('user_sessions')
        .update({
          session_end: new Date().toISOString(),
          duration_seconds: durationSeconds,
          exit_page: exitPageRef.current,
          pages_visited: pagesVisitedRef.current,
          is_bounce: isBounce,
        })
        .eq('id', sessionIdRef.current);

      logger.debug('Session ended:', sessionIdRef.current, `${durationSeconds}s`, isBounce ? '(bounce)' : '');
    } catch {
      // Silent fail
    } finally {
      isEndingRef.current = false;
    }
  }, []);

  // Track page navigation
  useEffect(() => {
    if (!hasStartedRef.current) return;
    
    exitPageRef.current = location.pathname;
    pagesVisitedRef.current += 1;

    // Update session with latest exit page and page count
    if (sessionIdRef.current) {
      supabase
        .from('user_sessions')
        .update({
          exit_page: location.pathname,
          pages_visited: pagesVisitedRef.current,
        })
        .eq('id', sessionIdRef.current)
        .then(({ error }) => {
          if (error) logger.debug('Page update failed:', error.message);
        });
    }
  }, [location.pathname]);

  // Heartbeat: update duration every 30s so we always have approximate data
  useEffect(() => {
    const interval = setInterval(() => {
      if (!sessionIdRef.current || !hasStartedRef.current) return;
      const durationSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      supabase
        .from('user_sessions')
        .update({ duration_seconds: durationSeconds, exit_page: exitPageRef.current })
        .eq('id', sessionIdRef.current)
        .then(({ error }) => {
          if (error) logger.debug('Heartbeat update failed:', error.message);
        });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Lifecycle: start on mount, end on unload/hide
  useEffect(() => {
    startSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endSession();
      } else if (document.visibilityState === 'visible') {
        if (isEndingRef.current || !sessionIdRef.current) {
          hasStartedRef.current = false;
          isEndingRef.current = false;
          startSession();
        }
      }
    };

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability on mobile
      if (sessionIdRef.current) {
        const durationSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        const body = JSON.stringify({
          duration_seconds: durationSeconds,
          session_end: new Date().toISOString(),
          exit_page: exitPageRef.current,
          pages_visited: pagesVisitedRef.current,
          is_bounce: durationSeconds < 10,
        });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`;
        const headers = {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Prefer': 'return=minimal',
        };
        const blob = new Blob([body], { type: 'application/json' });
        try {
          // Try sendBeacon first (most reliable on mobile)
          const sent = navigator.sendBeacon?.(url, blob);
          if (!sent) {
            // Fallback to regular update
            endSession();
          }
        } catch {
          endSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, [startSession, endSession]);
};
