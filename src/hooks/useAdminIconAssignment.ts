import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from './useCategories';
import { isLatinScript, buildSearchTerms } from '@/utils/transliteration';
import { useIconLibrarySlugSet } from './useIconLibrarySlugSet';

export interface QuestionForAssignment {
  id: string;
  question_text: string;
  correct_answer?: string;
  icon_slug: string | null;
  category_id: string;
  category_name?: string;
}

interface Stats {
  total: number;
  withIcons: number;
  withoutIcons: number;
}

const PAGE_SIZE = 50;

export function useAdminIconAssignment() {
  const [questions, setQuestions] = useState<QuestionForAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, withIcons: 0, withoutIcons: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showOnlyWithoutIcons, setShowOnlyWithoutIcons] = useState(false);
  
  const { categories } = useCategories();
  const { slugSet: iconSlugSet, loading: iconSlugSetLoading } = useIconLibrarySlugSet();

  const isValidIconSlug = useCallback(
    (slug: string | null) => {
      if (!slug) return false;
      // While icon slugs are still loading, fall back to the legacy behavior (non-null = "has icon")
      if (iconSlugSetLoading) return true;
      return iconSlugSet.has(slug.toLowerCase());
    },
    [iconSlugSet, iconSlugSetLoading]
  );

  const isMissingIcon = useCallback(
    (slug: string | null) => {
      if (!slug) return true;
      if (iconSlugSetLoading) return false;
      return !iconSlugSet.has(slug.toLowerCase());
    },
    [iconSlugSet, iconSlugSetLoading]
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const { count: total, error: totalError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (totalError) {
      console.error('Error fetching stats total:', totalError);
      return;
    }

    // While icon slugs are still loading, fall back to old counting.
    if (iconSlugSetLoading) {
      const { count: withIcons } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('icon_slug', 'is', null);

      setStats({
        total: total || 0,
        withIcons: withIcons || 0,
        withoutIcons: (total || 0) - (withIcons || 0)
      });
      return;
    }

    // Count valid icon assignments by scanning icon_slug values in pages
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;
    let withValidIcons = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from('questions')
        .select('icon_slug')
        .eq('is_active', true)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching stats page:', error);
        break;
      }

      const batch = data || [];
      for (const row of batch as any[]) {
        if (isValidIconSlug(row.icon_slug ?? null)) withValidIcons++;
      }

      hasMore = batch.length === pageSize;
      page++;
    }

    setStats({
      total: total || 0,
      withIcons: withValidIcons,
      withoutIcons: Math.max(0, (total || 0) - withValidIcons)
    });
  }, [iconSlugSetLoading, isValidIconSlug]);

  // Fetch questions with filters
  const fetchQuestions = useCallback(async (reset = false, currentSearchTerm?: string, currentCategoryFilter?: string | null, currentShowOnlyWithoutIcons?: boolean) => {
    setLoading(true);
    const currentPage = reset ? 0 : page;
    
    // Use passed values or current state
    const search = currentSearchTerm !== undefined ? currentSearchTerm : searchTerm;
    const catFilter = currentCategoryFilter !== undefined ? currentCategoryFilter : categoryFilter;
    const onlyWithout = currentShowOnlyWithoutIcons !== undefined ? currentShowOnlyWithoutIcons : showOnlyWithoutIcons;
    
    let query = supabase
      .from('questions')
      .select('id, question_text, correct_answer, icon_slug, category_id')
      .eq('is_active', true)
      .order('icon_slug', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (search) {
      const searchTerms = buildSearchTerms(search);
      
      if (isLatinScript(search)) {
        // For Latin input: search icon_slug + transliterated/semantic Georgian terms
        const orConditions: string[] = [];
        
        // Search by icon_slug (English keywords)
        orConditions.push(`icon_slug.ilike.%${search}%`);
        
        // Search question_text with all Georgian equivalents
        for (const term of searchTerms) {
          if (term !== search.toLowerCase()) {
            orConditions.push(`question_text.ilike.%${term}%`);
          }
        }
        
        query = query.or(orConditions.join(','));
      } else {
        // Georgian input - search directly in question_text
        query = query.ilike('question_text', `%${search}%`);
      }
    }

    if (catFilter) {
      query = query.eq('category_id', catFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      setLoading(false);
      return;
    }

    // Map category names - use uuid to match since questions have UUID category_id
    const questionsWithCategories = (data || []).map(q => ({
      ...q,
      category_name: categories.find(c => (c as any).uuid === q.category_id)?.name || 'უცნობი'
    }));

    const filteredQuestions = onlyWithout
      ? questionsWithCategories.filter(q => isMissingIcon(q.icon_slug ?? null))
      : questionsWithCategories;

    if (reset) {
      setQuestions(filteredQuestions);
      setPage(0);
    } else {
      setQuestions(prev => [...prev, ...filteredQuestions]);
    }

    // Pagination is based on raw fetch size; filtering happens client-side.
    setHasMore((data?.length || 0) === PAGE_SIZE);
    setLoading(false);
  }, [page, searchTerm, categoryFilter, showOnlyWithoutIcons, categories, isMissingIcon]);

  // Initial fetch and stats
  useEffect(() => {
    if (categories.length > 0) {
      fetchStats();
    }
  }, [fetchStats, categories.length]);

  // Fetch when filters change - pass current values to avoid stale closures
  useEffect(() => {
    if (categories.length > 0) {
      fetchQuestions(true, searchTerm, categoryFilter, showOnlyWithoutIcons);
    }
  }, [searchTerm, categoryFilter, showOnlyWithoutIcons, categories.length]);

  // Load more
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  // When page changes, fetch more
  useEffect(() => {
    if (page > 0 && categories.length > 0) {
      fetchQuestions(false);
    }
  }, [page, categories.length]);

  // Assign icon to question
  const assignIcon = useCallback(async (questionId: string, iconSlug: string) => {
    const { error } = await supabase
      .from('questions')
      .update({ icon_slug: iconSlug })
      .eq('id', questionId);

    if (error) {
      console.error('Error assigning icon:', error);
      return false;
    }

    // Update local state
    setQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, icon_slug: iconSlug } : q)
    );

    // Update stats
    setStats(prev => ({
      ...prev,
      withIcons: prev.withIcons + 1,
      withoutIcons: Math.max(0, prev.withoutIcons - 1)
    }));

    return true;
  }, []);

  // Remove icon from question
  const removeIcon = useCallback(async (questionId: string) => {
    const { error } = await supabase
      .from('questions')
      .update({ icon_slug: null })
      .eq('id', questionId);

    if (error) {
      console.error('Error removing icon:', error);
      return false;
    }

    setQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, icon_slug: null } : q)
    );

    setStats(prev => ({
      ...prev,
      withIcons: Math.max(0, prev.withIcons - 1),
      withoutIcons: prev.withoutIcons + 1
    }));

    return true;
  }, []);

  return {
    questions,
    loading,
    hasMore,
    stats,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    showOnlyWithoutIcons,
    setShowOnlyWithoutIcons,
    loadMore,
    assignIcon,
    removeIcon,
    categories,
    refetch: () => fetchQuestions(true)
  };
}
