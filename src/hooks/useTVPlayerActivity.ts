import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTVPlayerActivityProps {
  sessionId: string | null;
  playerId: string | null;
  enabled?: boolean;
}

/**
 * Hook to track player activity status in TV sessions.
 * Updates the player's is_active status in tv_players when:
 * - Screen locks (document.hidden = true) -> is_active = false
 * - Screen unlocks (document.hidden = false) -> is_active = true
 * 
 * This allows the game to skip waiting for inactive players
 * while still allowing them to rejoin when they return.
 */
export const useTVPlayerActivity = ({
  sessionId,
  playerId,
  enabled = true,
}: UseTVPlayerActivityProps) => {
  const isUpdatingRef = useRef(false);
  const lastStatusRef = useRef<boolean | null>(null);

  const updateActivityStatus = useCallback(async (isActive: boolean) => {
    if (!sessionId || !playerId || isUpdatingRef.current) return;
    
    // Avoid redundant updates
    if (lastStatusRef.current === isActive) return;
    
    isUpdatingRef.current = true;
    lastStatusRef.current = isActive;
    
    try {
      console.log('[TVPlayerActivity] Updating activity status:', { playerId, isActive });
      
      const { error } = await supabase
        .from('tv_players')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('tv_session_id', sessionId)
        .eq('player_id', playerId);

      if (error) {
        console.error('[TVPlayerActivity] Failed to update activity:', error);
        // Reset so we can retry
        lastStatusRef.current = null;
      }
    } catch (err) {
      console.error('[TVPlayerActivity] Exception updating activity:', err);
      lastStatusRef.current = null;
    } finally {
      isUpdatingRef.current = false;
    }
  }, [sessionId, playerId]);

  useEffect(() => {
    if (!enabled || !sessionId || !playerId) return;

    // Set initial state as active
    updateActivityStatus(true);

    const handleVisibilityChange = () => {
      const isActive = !document.hidden;
      console.log('[TVPlayerActivity] Visibility changed:', { isActive, hidden: document.hidden });
      updateActivityStatus(isActive);
    };

    // Also handle focus/blur for additional coverage
    const handleFocus = () => updateActivityStatus(true);
    const handleBlur = () => updateActivityStatus(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      
      // Mark as inactive when unmounting (leaving the game)
      // Don't await, just fire and forget
      updateActivityStatus(false);
    };
  }, [enabled, sessionId, playerId, updateActivityStatus]);

  return { updateActivityStatus };
};
