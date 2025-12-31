import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminCategory {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  icon_slug?: string | null;
  color: string;
  description: string | null;
  total_levels: number;
  type: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useAdminCategories = () => {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast({
        title: 'შეცდომა',
        description: 'კატეგორიების ჩატვირთვა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addCategory = async (category: Omit<AdminCategory, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      toast({
        title: 'წარმატება',
        description: 'კატეგორია დაემატა',
      });
      return data;
    } catch (err: any) {
      console.error('Error adding category:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'კატეგორიის დამატება ვერ მოხერხდა',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateCategory = async (id: string, updates: Partial<AdminCategory>) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'წარმატება',
        description: 'კატეგორია განახლდა',
      });
      return true;
    } catch (err: any) {
      console.error('Error updating category:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'კატეგორიის განახლება ვერ მოხერხდა',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'წარმატება',
        description: 'კატეგორია წაიშალა',
      });
      return true;
    } catch (err: any) {
      console.error('Error deleting category:', err);
      toast({
        title: 'შეცდომა',
        description: err.message || 'კატეგორიის წაშლა ვერ მოხერხდა',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
        },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCategories]);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
};
