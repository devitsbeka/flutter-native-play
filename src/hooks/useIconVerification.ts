import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface VerificationStats {
  total: number;
  valid: number;
  broken: number;
  lastChecked: string | null;
}

interface BrokenIcon {
  slug: string;
  icon_url: string;
  error_message: string | null;
}

export function useIconVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch verification stats from database
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['icon-verification-stats'],
    queryFn: async (): Promise<VerificationStats> => {
      const { data, error } = await supabase
        .from('icon_verification_results')
        .select('is_valid, last_checked_at');

      if (error) throw error;

      if (!data || data.length === 0) {
        return { total: 0, valid: 0, broken: 0, lastChecked: null };
      }

      const valid = data.filter(r => r.is_valid).length;
      const broken = data.filter(r => !r.is_valid).length;
      const lastChecked = data[0]?.last_checked_at || null;

      return { total: data.length, valid, broken, lastChecked };
    },
  });

  // Fetch broken icons list
  const { data: brokenIcons, isLoading: brokenLoading, refetch: refetchBroken } = useQuery({
    queryKey: ['broken-icons-list'],
    queryFn: async (): Promise<BrokenIcon[]> => {
      const { data, error } = await supabase
        .from('icon_verification_results')
        .select('slug, icon_url, error_message')
        .eq('is_valid', false)
        .order('slug');

      if (error) throw error;
      return data || [];
    },
  });

  // Run verification via edge function
  const runVerification = useCallback(async () => {
    setIsVerifying(true);
    setVerifyProgress('Starting verification...');

    try {
      const { data, error } = await supabase.functions.invoke('verify-icons');

      if (error) throw error;

      setVerifyProgress(`Complete: ${data.valid} valid, ${data.broken} broken`);
      
      // Refresh the queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['icon-verification-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['broken-icons-list'] }),
      ]);

      return data;
    } catch (error) {
      console.error('Verification failed:', error);
      setVerifyProgress('Verification failed');
      throw error;
    } finally {
      setIsVerifying(false);
    }
  }, [queryClient]);

  // Mark icon as fixed (remove from broken list)
  const markIconAsFixed = useCallback(async (slug: string, newUrl: string) => {
    const { error } = await supabase
      .from('icon_verification_results')
      .update({ is_valid: true, icon_url: newUrl, last_checked_at: new Date().toISOString() })
      .eq('slug', slug);

    if (error) throw error;

    // Refresh queries
    await Promise.all([
      refetchStats(),
      refetchBroken(),
    ]);
  }, [refetchStats, refetchBroken]);

  return {
    stats: stats || { total: 0, valid: 0, broken: 0, lastChecked: null },
    brokenIcons: brokenIcons || [],
    isLoading: statsLoading || brokenLoading,
    isVerifying,
    verifyProgress,
    runVerification,
    markIconAsFixed,
    refetch: async () => {
      await Promise.all([refetchStats(), refetchBroken()]);
    },
  };
}
