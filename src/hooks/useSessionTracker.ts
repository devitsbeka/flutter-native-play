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
      logger.debug('Session started:', data.id);
    } catch {
      // Silent fail
    }
  }, [getUserId, getCountryCode, location.pathname]);

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

  // Lifecycle: start on mount, end on unload/hide
  useEffect(() => {
    startSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endSession();
      } else if (document.visibilityState === 'visible') {
        // If returning after session ended, start a new one
        if (isEndingRef.current || !sessionIdRef.current) {
          hasStartedRef.current = false;
          isEndingRef.current = false;
          startSession();
        }
      }
    };

    const handleBeforeUnload = () => {
      endSession();
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
