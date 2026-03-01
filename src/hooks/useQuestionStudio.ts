import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type QuestionType = 'text' | 'image' | 'video' | 'audio';
export type ProductionStatus = 'library' | 'production';

export interface StudioQuestion {
  id: string;
  category_id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  level_number: number;
  is_active: boolean;
  in_production: boolean;
  icon_slug?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioFilters {
  questionType: QuestionType | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  hasIcon: boolean | null;
  sortBy: 'newest' | 'oldest' | 'alphabetical';
}

export interface CategoryWithCounts {
  id: string;
  name: string;
  icon_slug: string | null;
  color: string;
  libraryCount: number;
  productionCount: number;
}

const PAGE_SIZE = 50;

export function getQuestionType(q: StudioQuestion): QuestionType {
  if (q.video_url) return 'video';
  if (q.audio_url) return 'audio';
  if (q.image_url) return 'image';
  return 'text';
}

export const useQuestionStudio = () => {
  // Tab state
  const [productionStatus, setProductionStatus] = useState<ProductionStatus>('library');
  
  // Language filter
  const [language, setLanguage] = useState<'all' | 'en' | 'ka'>('all');
  
  // Category state
  const [categories, setCategories] = useState<CategoryWithCounts[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  
  // Questions state
  const [questions, setQuestions] = useState<StudioQuestion[]>([]);
  const [questionSearch, setQuestionSearch] = useState('');
  const [filters, setFilters] = useState<StudioFilters>({
    questionType: null,
    difficulty: null,
    hasIcon: null,
    sortBy: 'newest',
  });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  
  // Preview state
  const [previewIndex, setPreviewIndex] = useState(0);
  
  // Loading states
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Counts for tabs
  const [libraryCounts, setLibraryCounts] = useState(0);
  const [productionCounts, setProductionCounts] = useState(0);

  // Fetch category counts
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      // Fetch categories
      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('id, name, icon_slug, color')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (catsError) throw catsError;

      // Fetch counts per category
      let countsQuery = supabase
        .from('questions')
        .select('category_id, in_production');
      
      if (language !== 'all') {
        countsQuery = countsQuery.eq('language', language);
      }
      
      const { data: countsData, error: countsError } = await countsQuery;
      
      if (countsError) throw countsError;

      // Calculate counts
      const countMap: Record<string, { library: number; production: number }> = {};
      let totalLib = 0;
      let totalProd = 0;
      
      (countsData || []).forEach(q => {
        if (!countMap[q.category_id]) {
          countMap[q.category_id] = { library: 0, production: 0 };
        }
        if (q.in_production) {
          countMap[q.category_id].production++;
          totalProd++;
        } else {
          countMap[q.category_id].library++;
          totalLib++;
        }
      });

      setLibraryCounts(totalLib);
      setProductionCounts(totalProd);

      const categoriesWithCounts: CategoryWithCounts[] = (cats || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        icon_slug: cat.icon_slug,
        color: cat.color,
        libraryCount: countMap[cat.id]?.library || 0,
        productionCount: countMap[cat.id]?.production || 0,
      }));

      setCategories(categoriesWithCounts);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast.error('კატეგორიების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoadingCategories(false);
    }
  }, [language]);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const inProd = productionStatus === 'production';
      const offset = page * PAGE_SIZE;
      const normalizedSearch = questionSearch.trim();

      // When searching, use RPC for proper incorrect_answers search
      if (normalizedSearch) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('search_questions', {
          p_search: normalizedSearch,
          p_category_id: selectedCategoryId || null,
          p_limit: PAGE_SIZE,
          p_offset: offset,
        });

        if (rpcError) throw rpcError;

        // Filter RPC results client-side for in_production, language, and other filters
        let results = (rpcData || []) as any[];
        results = results.filter((q: any) => (q.in_production ?? false) === inProd);
        
        // Apply language filter
        if (language !== 'all') {
          results = results.filter((q: any) => q.language === language);
        }

        // Apply type filter
        if (filters.questionType) {
          results = results.filter((q: any) => {
            switch (filters.questionType) {
              case 'video': return !!q.video_url;
              case 'audio': return !!q.audio_url && !q.video_url;
              case 'image': return !!q.image_url && !q.video_url && !q.audio_url;
              case 'text': return !q.image_url && !q.video_url && !q.audio_url;
              default: return true;
            }
          });
        }

        if (filters.difficulty) {
          results = results.filter((q: any) => q.difficulty === filters.difficulty);
        }

        if (filters.hasIcon === true) {
          results = results.filter((q: any) => !!q.icon_slug);
        } else if (filters.hasIcon === false) {
          results = results.filter((q: any) => !q.icon_slug);
        }

        setTotalCount(results.length);

        // Apply sorting
        if (filters.sortBy === 'oldest') {
          results.sort((a: any, b: any) => (a.created_at || '').localeCompare(b.created_at || ''));
        } else if (filters.sortBy === 'alphabetical') {
          results.sort((a: any, b: any) => (a.question_text || '').localeCompare(b.question_text || ''));
        }

        const formatted: StudioQuestion[] = results.map((q: any) => ({
          id: q.id,
          category_id: q.category_id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: Array.isArray(q.incorrect_answers) ? q.incorrect_answers as string[] : [],
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          level_number: q.level_number || 1,
          is_active: q.is_active ?? true,
          in_production: q.in_production ?? false,
          icon_slug: q.icon_slug,
          image_url: q.image_url,
          video_url: q.video_url,
          audio_url: q.audio_url,
          created_at: q.created_at || '',
          updated_at: q.updated_at || '',
        }));

        setQuestions(formatted);
        setPreviewIndex(0);
      } else {
        // No search: use standard queries
        let countQuery = supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('in_production', inProd);
        
        if (selectedCategoryId) {
          countQuery = countQuery.eq('category_id', selectedCategoryId);
        }

        if (language !== 'all') {
          countQuery = countQuery.eq('language', language);
        }

        // Apply type filter
        if (filters.questionType) {
          switch (filters.questionType) {
            case 'video':
              countQuery = countQuery.not('video_url', 'is', null);
              break;
            case 'audio':
              countQuery = countQuery.not('audio_url', 'is', null).is('video_url', null);
              break;
            case 'image':
              countQuery = countQuery.not('image_url', 'is', null).is('video_url', null).is('audio_url', null);
              break;
            case 'text':
              countQuery = countQuery.is('image_url', null).is('video_url', null).is('audio_url', null);
              break;
          }
        }

        if (filters.difficulty) {
          countQuery = countQuery.eq('difficulty', filters.difficulty);
        }

        if (filters.hasIcon === true) {
          countQuery = countQuery.not('icon_slug', 'is', null);
        } else if (filters.hasIcon === false) {
          countQuery = countQuery.is('icon_slug', null);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;
        setTotalCount(count || 0);

        // Build data query
        let dataQuery = supabase
          .from('questions')
          .select('id, category_id, question_text, correct_answer, incorrect_answers, difficulty, level_number, is_active, in_production, icon_slug, image_url, video_url, audio_url, created_at, updated_at')
          .eq('in_production', inProd)
          .range(offset, offset + PAGE_SIZE - 1);

        if (selectedCategoryId) {
          dataQuery = dataQuery.eq('category_id', selectedCategoryId);
        }

        if (language !== 'all') {
          dataQuery = dataQuery.eq('language', language);
        }

        // Apply type filter
        if (filters.questionType) {
          switch (filters.questionType) {
            case 'video':
              dataQuery = dataQuery.not('video_url', 'is', null);
              break;
            case 'audio':
              dataQuery = dataQuery.not('audio_url', 'is', null).is('video_url', null);
              break;
            case 'image':
              dataQuery = dataQuery.not('image_url', 'is', null).is('video_url', null).is('audio_url', null);
              break;
            case 'text':
              dataQuery = dataQuery.is('image_url', null).is('video_url', null).is('audio_url', null);
              break;
          }
        }

        if (filters.difficulty) {
          dataQuery = dataQuery.eq('difficulty', filters.difficulty);
        }

        if (filters.hasIcon === true) {
          dataQuery = dataQuery.not('icon_slug', 'is', null);
        } else if (filters.hasIcon === false) {
          dataQuery = dataQuery.is('icon_slug', null);
        }

        // Apply sorting
        switch (filters.sortBy) {
          case 'oldest':
            dataQuery = dataQuery.order('created_at', { ascending: true });
            break;
          case 'alphabetical':
            dataQuery = dataQuery.order('question_text', { ascending: true });
            break;
          default:
            dataQuery = dataQuery.order('created_at', { ascending: false });
        }

        const { data, error } = await dataQuery;
        if (error) throw error;

        const formatted: StudioQuestion[] = (data || []).map(q => ({
          id: q.id,
          category_id: q.category_id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: Array.isArray(q.incorrect_answers) ? q.incorrect_answers as string[] : [],
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          level_number: q.level_number || 1,
          is_active: q.is_active ?? true,
          in_production: q.in_production ?? false,
          icon_slug: q.icon_slug,
          image_url: q.image_url,
          video_url: q.video_url,
          audio_url: q.audio_url,
          created_at: q.created_at || '',
          updated_at: q.updated_at || '',
        }));

        setQuestions(formatted);
        setPreviewIndex(0);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      toast.error('კითხვების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoadingQuestions(false);
    }
  }, [productionStatus, selectedCategoryId, questionSearch, filters, page, language]);

  // Selection helpers
  const toggleSelection = useCallback((id: string, index: number, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      
      if (shiftKey && lastClickedIndex !== null) {
        // Range select
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        for (let i = start; i <= end; i++) {
          if (questions[i]) {
            next.add(questions[i].id);
          }
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      
      return next;
    });
    setLastClickedIndex(index);
  }, [lastClickedIndex, questions]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(questions.map(q => q.id)));
  }, [questions]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  // Bulk operations
  const bulkPushToProduction = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ in_production: true })
        .in('id', ids);
      
      if (error) throw error;
      toast.success(`${ids.length} კითხვა გადავიდა Production-ში`);
      clearSelection();
      fetchQuestions();
      fetchCategories();
    } catch (err) {
      console.error('Error pushing to production:', err);
      toast.error('შეცდომა Production-ში გადატანისას');
    }
  }, [clearSelection, fetchQuestions, fetchCategories]);

  const bulkRemoveFromProduction = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ in_production: false })
        .in('id', ids);
      
      if (error) throw error;
      toast.success(`${ids.length} კითხვა გადავიდა Library-ში`);
      clearSelection();
      fetchQuestions();
      fetchCategories();
    } catch (err) {
      console.error('Error removing from production:', err);
      toast.error('შეცდომა Library-ში გადატანისას');
    }
  }, [clearSelection, fetchQuestions, fetchCategories]);

  const bulkDelete = useCallback(async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      toast.success(`${ids.length} კითხვა წაიშალა`);
      clearSelection();
      fetchQuestions();
      fetchCategories();
    } catch (err) {
      console.error('Error deleting questions:', err);
      toast.error('შეცდომა კითხვების წაშლისას');
    }
  }, [clearSelection, fetchQuestions, fetchCategories]);

  const bulkAssignIcon = useCallback(async (ids: string[], iconSlug: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ icon_slug: iconSlug })
        .in('id', ids);
      
      if (error) throw error;
      toast.success(`${ids.length} კითხვას მიენიჭა აიკონი`);
      clearSelection();
      fetchQuestions();
    } catch (err) {
      console.error('Error assigning icons:', err);
      toast.error('შეცდომა აიკონის მინიჭებისას');
    }
  }, [clearSelection, fetchQuestions]);

  const bulkChangeDifficulty = useCallback(async (ids: string[], difficulty: 'easy' | 'medium' | 'hard') => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ difficulty })
        .in('id', ids);
      
      if (error) throw error;
      toast.success(`${ids.length} კითხვას შეეცვალა სირთულე`);
      clearSelection();
      fetchQuestions();
    } catch (err) {
      console.error('Error changing difficulty:', err);
      toast.error('შეცდომა სირთულის შეცვლისას');
    }
  }, [clearSelection, fetchQuestions]);

  // Single question operations
  const updateQuestion = useCallback(async (id: string, updates: Partial<StudioQuestion>) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      toast.success('კითხვა განახლდა');
      fetchQuestions();
      if (updates.in_production !== undefined) {
        fetchCategories();
      }
      return true;
    } catch (err) {
      console.error('Error updating question:', err);
      toast.error('შეცდომა კითხვის განახლებისას');
      return false;
    }
  }, [fetchQuestions, fetchCategories]);

  const deleteQuestion = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('კითხვა წაიშალა');
      fetchQuestions();
      fetchCategories();
      return true;
    } catch (err) {
      console.error('Error deleting question:', err);
      toast.error('შეცდომა კითხვის წაშლისას');
      return false;
    }
  }, [fetchQuestions, fetchCategories]);

  const duplicateQuestion = useCallback(async (question: StudioQuestion) => {
    try {
      const { error } = await supabase
        .from('questions')
        .insert({
          category_id: question.category_id,
          question_text: question.question_text + ' (ასლი)',
          correct_answer: question.correct_answer,
          incorrect_answers: question.incorrect_answers,
          difficulty: question.difficulty,
          level_number: question.level_number,
          is_active: true,
          in_production: false, // Always goes to library
          icon_slug: question.icon_slug,
          image_url: question.image_url,
          video_url: question.video_url,
          audio_url: question.audio_url,
        });
      
      if (error) throw error;
      toast.success('კითხვა დუბლირებულია Library-ში');
      fetchQuestions();
      fetchCategories();
      return true;
    } catch (err) {
      console.error('Error duplicating question:', err);
      toast.error('შეცდომა კითხვის დუბლირებისას');
      return false;
    }
  }, [fetchQuestions, fetchCategories]);

  // Add new question
  const addQuestion = useCallback(async (question: Omit<StudioQuestion, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'level_number'>) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert({
          category_id: question.category_id,
          question_text: question.question_text,
          correct_answer: question.correct_answer,
          incorrect_answers: question.incorrect_answers,
          difficulty: question.difficulty,
          level_number: 1,
          is_active: true,
          in_production: false,
          icon_slug: question.icon_slug,
          image_url: question.image_url,
          video_url: question.video_url,
          audio_url: question.audio_url,
        })
        .select()
        .single();
      
      if (error) throw error;
      toast.success('კითხვა შეიქმნა');
      fetchQuestions();
      fetchCategories();
      return true;
    } catch (err) {
      console.error('Error adding question:', err);
      toast.error('კითხვის შექმნა ვერ მოხერხდა');
      return false;
    }
  }, [fetchQuestions, fetchCategories]);

  // Bulk add questions
  const bulkAddQuestions = useCallback(async (questions: Array<{
    category_id: string;
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    image_url?: string;
    video_url?: string;
    audio_url?: string;
  }>) => {
    try {
      const { error } = await supabase
        .from('questions')
        .insert(questions.map(q => ({
          ...q,
          level_number: 1,
          is_active: true,
          in_production: false,
        })));
      
      if (error) throw error;
      toast.success(`${questions.length} კითხვა დაემატა`);
      fetchQuestions();
      fetchCategories();
      return true;
    } catch (err) {
      console.error('Error bulk adding questions:', err);
      toast.error('კითხვების დამატება ვერ მოხერხდა');
      return false;
    }
  }, [fetchQuestions, fetchCategories]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
    clearSelection();
  }, [productionStatus, selectedCategoryId, questionSearch, filters, language, clearSelection]);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Filtered categories for sidebar
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const search = categorySearch.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(search));
  }, [categories, categorySearch]);

  // Current preview question
  const previewQuestion = questions[previewIndex] || null;

  return {
    // Tab
    productionStatus,
    setProductionStatus,
    libraryCounts,
    productionCounts,
    
    // Language
    language,
    setLanguage,
    
    // Categories
    categories: filteredCategories,
    allCategories: categories,
    selectedCategoryId,
    setSelectedCategoryId,
    categorySearch,
    setCategorySearch,
    loadingCategories,
    
    // Questions
    questions,
    questionSearch,
    setQuestionSearch,
    filters,
    setFilters,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    totalCount,
    loadingQuestions,
    
    // Selection
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    
    // Preview
    previewIndex,
    setPreviewIndex,
    previewQuestion,
    
    // Bulk operations
    bulkPushToProduction,
    bulkRemoveFromProduction,
    bulkDelete,
    bulkAssignIcon,
    bulkChangeDifficulty,
    
    // Single operations
    updateQuestion,
    deleteQuestion,
    duplicateQuestion,
    addQuestion,
    bulkAddQuestions,
    
    // Refetch
    refetchCategories: fetchCategories,
    refetchQuestions: fetchQuestions,
  };
};
