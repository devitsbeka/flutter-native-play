import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH, isQuestionComplete } from '@/utils/questionValidation';
import { detectQuestionLanguage } from '@/utils/languageDetection';

export interface AdminQuestion {
  id: string;
  category_id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  level_number: number;
  is_active: boolean;
  in_production?: boolean;
  icon_slug?: string;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 50;

export const useAdminQuestions = (categoryId?: string | null, searchTerm?: string) => {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const normalizedSearch = searchTerm?.trim();
      const offset = page * PAGE_SIZE;

      if (normalizedSearch) {
        // Use RPC for search (supports incorrect_answers::text casting)
        const { data, error } = await supabase.rpc('search_questions', {
          p_search: normalizedSearch,
          p_category_id: categoryId || null,
          p_limit: PAGE_SIZE,
          p_offset: offset,
        });

        if (error) {
          console.error('Error searching questions:', error);
          toast.error('კითხვების ძიება ვერ მოხერხდა');
          setLoading(false);
          return;
        }

        const results = data || [];
        setTotalCount(results.length > 0 ? Number((results[0] as any).total_count) : 0);

        const formattedQuestions: AdminQuestion[] = results.map((q: any) => ({
          id: q.id,
          category_id: q.category_id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: Array.isArray(q.incorrect_answers) 
            ? q.incorrect_answers as string[]
            : [],
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          level_number: q.level_number || 1,
          is_active: q.is_active ?? true,
          in_production: q.in_production ?? false,
          icon_slug: q.icon_slug || undefined,
          image_url: q.image_url || null,
          video_url: q.video_url || null,
          audio_url: q.audio_url || null,
          created_at: q.created_at || '',
          updated_at: q.updated_at || '',
        }));

        setQuestions(formattedQuestions);
      } else {
        // No search: use standard queries
        let countQuery = supabase
          .from('questions')
          .select('*', { count: 'exact', head: true });
        
        if (categoryId) {
          countQuery = countQuery.eq('category_id', categoryId);
        }
        
        const { count, error: countError } = await countQuery;
        
        if (countError) {
          console.error('Error fetching count:', countError);
          toast.error('კითხვების რაოდენობის ჩატვირთვა ვერ მოხერხდა');
          setLoading(false);
          return;
        }
        
        setTotalCount(count || 0);
        
        let dataQuery = supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        
        if (categoryId) {
          dataQuery = dataQuery.eq('category_id', categoryId);
        }
        
        const { data, error } = await dataQuery;
        
        if (error) {
          console.error('Error fetching questions:', error);
          toast.error('კითხვების ჩატვირთვა ვერ მოხერხდა');
          setLoading(false);
          return;
        }
        
        const formattedQuestions: AdminQuestion[] = (data || []).map((q) => ({
          id: q.id,
          category_id: q.category_id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: Array.isArray(q.incorrect_answers) 
            ? q.incorrect_answers as string[]
            : [],
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          level_number: q.level_number || 1,
          is_active: q.is_active ?? true,
          in_production: q.in_production ?? false,
          icon_slug: q.icon_slug || undefined,
          image_url: q.image_url || null,
          video_url: q.video_url || null,
          audio_url: q.audio_url || null,
          created_at: q.created_at || '',
          updated_at: q.updated_at || '',
        }));
        
        setQuestions(formattedQuestions);
      }
    } catch (err) {
      console.error('Error in fetchQuestions:', err);
      toast.error('კითხვების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [categoryId, page, searchTerm]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Reset page when category/search changes
  useEffect(() => {
    setPage(0);
  }, [categoryId, searchTerm]);

  // Real-time subscription with local updates (no full refetch)
  useEffect(() => {
    // Keep things simple: when searching, skip realtime updates so results remain consistent.
    if (searchTerm?.trim()) return;

    const channel = supabase
      .channel('admin-questions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newQ = payload.new as any;
            // Only add if matches current filter
            if (!categoryId || newQ.category_id === categoryId) {
              const formatted: AdminQuestion = {
                id: newQ.id,
                category_id: newQ.category_id,
                question_text: newQ.question_text,
                correct_answer: newQ.correct_answer,
                incorrect_answers: Array.isArray(newQ.incorrect_answers) 
                  ? newQ.incorrect_answers 
                  : [],
                difficulty: newQ.difficulty,
                level_number: newQ.level_number || 1,
                is_active: newQ.is_active ?? true,
                in_production: newQ.in_production ?? false,
                icon_slug: newQ.icon_slug || undefined,
                image_url: newQ.image_url || null,
                video_url: newQ.video_url || null,
                audio_url: newQ.audio_url || null,
                created_at: newQ.created_at || '',
                updated_at: newQ.updated_at || '',
              };
              setQuestions(prev => [formatted, ...prev].slice(0, PAGE_SIZE));
              setTotalCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setQuestions(prev => prev.map(q => 
              q.id === updated.id ? {
                ...q,
                question_text: updated.question_text,
                correct_answer: updated.correct_answer,
                incorrect_answers: Array.isArray(updated.incorrect_answers) 
                  ? updated.incorrect_answers 
                  : q.incorrect_answers,
                difficulty: updated.difficulty,
                level_number: updated.level_number || 1,
                is_active: updated.is_active ?? true,
                in_production: updated.in_production ?? false,
                icon_slug: updated.icon_slug || undefined,
                updated_at: updated.updated_at || '',
              } : q
            ));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any;
            setQuestions(prev => prev.filter(q => q.id !== deleted.id));
            setTotalCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId, searchTerm]);

  const addQuestion = async (question: Omit<AdminQuestion, 'id' | 'created_at' | 'updated_at'>) => {
    // Validate question before saving
    if (!isQuestionComplete(question.question_text, question.correct_answer, question.incorrect_answers)) {
      if (question.question_text.length > QUESTION_MAX_LENGTH) {
        toast.error(`კითხვა ძალიან გრძელია (${question.question_text.length}/${QUESTION_MAX_LENGTH})`);
      } else if (question.correct_answer.length > ANSWER_MAX_LENGTH) {
        toast.error(`სწორი პასუხი ძალიან გრძელია (${question.correct_answer.length}/${ANSWER_MAX_LENGTH})`);
      } else {
        const longAnswer = question.incorrect_answers.find(a => a.length > ANSWER_MAX_LENGTH);
        if (longAnswer) {
          toast.error(`არასწორი პასუხი ძალიან გრძელია (${longAnswer.length}/${ANSWER_MAX_LENGTH})`);
        } else {
          toast.error('კითხვა/პასუხი არავალიდურია');
        }
      }
      return null;
    }

    try {
      const detectedLang = detectQuestionLanguage(question.question_text, question.correct_answer);
      const { data, error } = await supabase
        .from('questions')
        .insert({
          ...question,
          incorrect_answers: question.incorrect_answers,
          language: detectedLang,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('კითხვა დაემატა');
      return data;
    } catch (err: any) {
      console.error('Error adding question:', err);
      toast.error(err.message || 'კითხვის დამატება ვერ მოხერხდა');
      return null;
    }
  };

  const updateQuestion = async (id: string, updates: Partial<AdminQuestion>) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('კითხვა განახლდა');
      return true;
    } catch (err: any) {
      console.error('Error updating question:', err);
      toast.error(err.message || 'კითხვის განახლება ვერ მოხერხდა');
      return false;
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('კითხვა წაიშალა');
      return true;
    } catch (err: any) {
      console.error('Error deleting question:', err);
      toast.error(err.message || 'კითხვის წაშლა ვერ მოხერხდა');
      return false;
    }
  };

  const bulkAddQuestions = async (questionsData: Omit<AdminQuestion, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert(questionsData)
        .select();

      if (error) throw error;
      toast.success(`${data.length} კითხვა დაემატა`);
      return data;
    } catch (err: any) {
      console.error('Error bulk adding questions:', err);
      toast.error(err.message || 'კითხვების დამატება ვერ მოხერხდა');
      return null;
    }
  };

  return {
    questions,
    loading,
    totalCount,
    page,
    pageSize: PAGE_SIZE,
    setPage,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    bulkAddQuestions,
    refetch: fetchQuestions,
  };
};
