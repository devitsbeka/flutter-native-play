import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showRetry, setShowRetry] = useState(false);

  const checkAdminRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
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

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowRetry(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowRetry(false);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">იტვირთება...</p>
          {showRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkAdminRole}
              className="mt-2 gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              ხელახლა ცდა
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
