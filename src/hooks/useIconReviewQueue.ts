import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from './useCategories';

export interface ReviewQuestion {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  icon_slug: string | null;
  category_id: string;
  category_name: string;
}

interface Stats {
  total: number;
  withIcons: number;
  withoutIcons: number;
}

const PAGE_SIZE = 20;

export function useIconReviewQueue() {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, withIcons: 0, withoutIcons: 0 });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showOnlyWithoutIcons, setShowOnlyWithoutIcons] = useState(true);
  const [page, setPage] = useState(0);
  
  const { categories } = useCategories();

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const { count: total } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

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
  }, []);

  // Fetch questions
  const fetchQuestions = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 0 : page;
    
    let query = supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, icon_slug, category_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (categoryFilter) {
      query = query.eq('category_id', categoryFilter);
    }

    if (showOnlyWithoutIcons) {
      query = query.is('icon_slug', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      setLoading(false);
      return;
    }

    // Create Map for O(1) category lookups instead of O(n) .find() calls
    const categoryMap = new Map(categories.map(c => [(c as any).uuid, c.name]));
    
    // Map category names
    const questionsWithCategories: ReviewQuestion[] = (data || []).map(q => {
      const incorrectAnswers = Array.isArray(q.incorrect_answers) 
        ? q.incorrect_answers as string[]
        : [];
      
      return {
        ...q,
        incorrect_answers: incorrectAnswers,
        category_name: categoryMap.get(q.category_id) || 'უცნობი'
      };
    });

    if (reset) {
      setQuestions(questionsWithCategories);
      setCurrentIndex(0);
      setPage(0);
    } else {
      setQuestions(prev => [...prev, ...questionsWithCategories]);
    }

    setHasMore((data?.length || 0) === PAGE_SIZE);
    setLoading(false);
  }, [page, categoryFilter, showOnlyWithoutIcons, categories]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch when filters change
  useEffect(() => {
    if (categories.length > 0) {
      fetchQuestions(true);
    }
  }, [categoryFilter, showOnlyWithoutIcons, categories.length]);

  // Load more when approaching end
  useEffect(() => {
    if (currentIndex >= questions.length - 3 && hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  }, [currentIndex, questions.length, hasMore, loading]);

  // Fetch more when page changes
  useEffect(() => {
    if (page > 0 && categories.length > 0) {
      fetchQuestions(false);
    }
  }, [page, categories.length]);

  const goNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, questions.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const assignIcon = useCallback(async (iconSlug: string) => {
    const question = questions[currentIndex];
    if (!question) return false;

    const { error } = await supabase
      .from('questions')
      .update({ icon_slug: iconSlug })
      .eq('id', question.id);

    if (error) {
      console.error('Error assigning icon:', error);
      return false;
    }

    // Update local state
    setQuestions(prev => 
      prev.map((q, i) => i === currentIndex ? { ...q, icon_slug: iconSlug } : q)
    );

    // Update stats
    if (!question.icon_slug) {
      setStats(prev => ({
        ...prev,
        withIcons: prev.withIcons + 1,
        withoutIcons: Math.max(0, prev.withoutIcons - 1)
      }));
    }

    return true;
  }, [currentIndex, questions]);

  const removeIcon = useCallback(async () => {
    const question = questions[currentIndex];
    if (!question || !question.icon_slug) return false;

    const { error } = await supabase
      .from('questions')
      .update({ icon_slug: null })
      .eq('id', question.id);

    if (error) {
      console.error('Error removing icon:', error);
      return false;
    }

    setQuestions(prev => 
      prev.map((q, i) => i === currentIndex ? { ...q, icon_slug: null } : q)
    );

    setStats(prev => ({
      ...prev,
      withIcons: Math.max(0, prev.withIcons - 1),
      withoutIcons: prev.withoutIcons + 1
    }));

    return true;
  }, [currentIndex, questions]);

  const currentQuestion = questions[currentIndex] || null;
  const prevQuestion = questions[currentIndex - 1] || null;
  const nextQuestion = questions[currentIndex + 1] || null;

  return {
    questions,
    currentQuestion,
    prevQuestion,
    nextQuestion,
    currentIndex,
    totalLoaded: questions.length,
    loading,
    hasMore,
    stats,
    categoryFilter,
    setCategoryFilter,
    showOnlyWithoutIcons,
    setShowOnlyWithoutIcons,
    goNext,
    goPrev,
    assignIcon,
    removeIcon,
    categories,
    refetch: () => fetchQuestions(true)
  };
}
