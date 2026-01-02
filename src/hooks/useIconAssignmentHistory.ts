import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssignmentHistoryItem {
  id: string;
  question_id: string;
  question_text: string | null;
  old_icon_slug: string | null;
  new_icon_slug: string;
  assignment_method: string;
  category_id: string | null;
  category_name: string | null;
  assigned_by: string | null;
  assigned_at: string;
}

interface UseIconAssignmentHistoryOptions {
  limit?: number;
  timeRange?: 'hour' | 'day' | 'week' | 'all';
  categoryId?: string | null;
  method?: string | null;
}

export function useIconAssignmentHistory(options: UseIconAssignmentHistoryOptions = {}) {
  const { limit = 100, timeRange = 'day', categoryId = null, method = null } = options;
  
  const [history, setHistory] = useState<AssignmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    
    try {
      // Calculate date filter based on time range
      let dateFilter: string | null = null;
      const now = new Date();
      
      switch (timeRange) {
        case 'hour':
          dateFilter = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
          break;
        case 'day':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'week':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'all':
          dateFilter = null;
          break;
      }

      let query = supabase
        .from('icon_assignment_history')
        .select('*', { count: 'exact' })
        .order('assigned_at', { ascending: false })
        .limit(limit);

      if (dateFilter) {
        query = query.gte('assigned_at', dateFilter);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (method) {
        query = query.eq('assignment_method', method);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching assignment history:', error);
        return;
      }

      setHistory(data as AssignmentHistoryItem[] || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, timeRange, categoryId, method]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Get unique methods from history for filtering
  const uniqueMethods = [...new Set(history.map(h => h.assignment_method))];

  return {
    history,
    loading,
    totalCount,
    uniqueMethods,
    refetch: fetchHistory
  };
}
