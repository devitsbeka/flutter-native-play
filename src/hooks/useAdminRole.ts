import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkAdminRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    setChecking(true);
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
      setChecking(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      checkAdminRole();
    }
  }, [authLoading, checkAdminRole]);

  const loading = authLoading || checking;

  return { isAdmin, loading, retry: checkAdminRole };
};
