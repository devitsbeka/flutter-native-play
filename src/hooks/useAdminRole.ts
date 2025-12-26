import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      // Prevent duplicate checks
      if (hasChecked.current) return;
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      hasChecked.current = true;

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
    };

    // Only run check when auth is done loading
    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

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

  return { isAdmin, loading: loading || authLoading };
};
