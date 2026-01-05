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

  // Fetch verification stats from database using COUNT queries to avoid row limits
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['icon-verification-stats'],
    queryFn: async (): Promise<VerificationStats> => {
      // Use COUNT queries to get accurate totals (bypasses 1000 row limit)
      const [totalResult, validResult, brokenResult, lastCheckedResult] = await Promise.all([
        supabase.from('icon_verification_results').select('*', { count: 'exact', head: true }),
        supabase.from('icon_verification_results').select('*', { count: 'exact', head: true }).eq('is_valid', true),
        supabase.from('icon_verification_results').select('*', { count: 'exact', head: true }).eq('is_valid', false),
        supabase.from('icon_verification_results').select('last_checked_at').order('last_checked_at', { ascending: false }).limit(1),
      ]);

      if (totalResult.error) throw totalResult.error;

      return {
        total: totalResult.count || 0,
        valid: validResult.count || 0,
        broken: brokenResult.count || 0,
        lastChecked: lastCheckedResult.data?.[0]?.last_checked_at || null,
      };
    },
  });

  // Fetch broken icons list with pagination to get all results
  const { data: brokenIcons, isLoading: brokenLoading, refetch: refetchBroken } = useQuery({
    queryKey: ['broken-icons-list'],
    queryFn: async (): Promise<BrokenIcon[]> => {
      const allBroken: BrokenIcon[] = [];
      const pageSize = 1000;
      let page = 0;

      while (true) {
        const { data, error } = await supabase
          .from('icon_verification_results')
          .select('slug, icon_url, error_message')
          .eq('is_valid', false)
          .order('slug')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data?.length) break;
        
        allBroken.push(...data);
        if (data.length < pageSize) break;
        page++;
      }

      return allBroken;
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
