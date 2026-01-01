import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminQuestion {
  id: string;
  category_id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  level_number: number;
  is_active: boolean;
  icon_slug?: string;
  created_at: string;
  updated_at: string;
}

export const useAdminQuestions = (categoryId?: string) => {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('questions')
        .select('*')
        .order('level_number', { ascending: true })
        .limit(10000); // Load all questions

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuestions((data || []).map(q => ({
        ...q,
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        icon_slug: q.icon_slug || undefined,
        incorrect_answers: Array.isArray(q.incorrect_answers) 
          ? (q.incorrect_answers as unknown as string[]) 
          : [],
      })));
    } catch (err) {
      console.error('Error fetching questions:', err);
      toast({
        title: 'შეცდომა',
        description: 'კითხვების ჩატვირთვა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [categoryId, toast]);

  const addQuestion = async (question: Omit<AdminQuestion, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert({
          ...question,
          incorrect_answers: question.incorrect_answers,
        })
        .select()
        .single();

      if (error) throw error;
      toast({
        title: 'წარმატება',
        description: 'კითხვა დაემატა',
      });
      return data;
    } catch (err: any) {
      console.error('Error adding question:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'კითხვის დამატება ვერ მოხერხდა',
        variant: 'destructive',
      });
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
      toast({
        title: 'წარმატება',
        description: 'კითხვა განახლდა',
      });
      return true;
    } catch (err: any) {
      console.error('Error updating question:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'კითხვის განახლება ვერ მოხერხდა',
        variant: 'destructive',
      });
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
      toast({
        title: 'წარმატება',
        description: 'კითხვა წაიშალა',
      });
      return true;
    } catch (err: any) {
      console.error('Error deleting question:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'კითხვის წაშლა ვერ მოხერხდა',
        variant: 'destructive',
      });
      return false;
    }
  };

  const bulkAddQuestions = async (questions: Omit<AdminQuestion, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert(questions)
        .select();

      if (error) throw error;
      toast({
        title: 'წარმატება',
        description: `${data.length} კითხვა დაემატა`,
      });
      return data;
    } catch (err: any) {
      console.error('Error bulk adding questions:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'კითხვების დამატება ვერ მოხერხდა',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-questions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
        },
        () => {
          fetchQuestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQuestions]);

  return {
    questions,
    loading,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    bulkAddQuestions,
    refetch: fetchQuestions,
  };
};
