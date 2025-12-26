import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasChecked = useRef(false);

  const checkAdminRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      console.log('Checking admin role for user:', user.id);
      
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        console.log('Admin role check result:', data);
        setIsAdmin(data === true);
      }
    } catch (err) {
      console.error('Error in admin check:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Prevent duplicate checks on initial load
    if (hasChecked.current) return;
    
    // Only run check when auth is done loading
    if (!authLoading) {
      hasChecked.current = true;
      checkAdminRole();
    }
  }, [authLoading, checkAdminRole]);

  // Reset hasChecked when user changes
  useEffect(() => {
    hasChecked.current = false;
  }, [user?.id]);

  // Safety timeout - if loading takes more than 5 seconds, assume not admin
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Admin role check timeout - assuming not admin');
        setLoading(false);
        setIsAdmin(false);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const retry = useCallback(() => {
    hasChecked.current = false;
    checkAdminRole();
  }, [checkAdminRole]);

  return { isAdmin, loading: loading || authLoading, retry };
};
