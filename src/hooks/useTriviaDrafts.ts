import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TriviaDraftData {
  id: string;
  user_id: string;
  title: string | null;
  questions: any[];
  created_at: string;
  updated_at: string;
}

export function useTriviaDrafts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const draftsQuery = useQuery({
    queryKey: ["trivia-drafts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trivia_drafts")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as TriviaDraftData[];
    },
    enabled: !!user,
  });

  const saveDraftMutation = useMutation({
    mutationFn: async ({ 
      draftId, 
      title, 
      questions 
    }: { 
      draftId?: string; 
      title: string | null; 
      questions: any[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const draftData = {
        user_id: user.id,
        title,
        questions,
        updated_at: new Date().toISOString(),
      };

      if (draftId) {
        const { data, error } = await supabase
          .from("trivia_drafts")
          .update(draftData)
          .eq("id", draftId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("trivia_drafts")
          .insert(draftData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trivia-drafts"] });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from("trivia_drafts")
        .delete()
        .eq("id", draftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trivia-drafts"] });
      toast.success("დრაფტი წაიშალა");
    },
    onError: () => {
      toast.error("დრაფტის წაშლა ვერ მოხერხდა");
    },
  });

  const loadDraft = async (draftId: string): Promise<TriviaDraftData | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("trivia_drafts")
      .select("*")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      toast.error("დრაფტის ჩატვირთვა ვერ მოხერხდა");
      return null;
    }

    return data as TriviaDraftData;
  };

  return {
    drafts: draftsQuery.data,
    isLoading: draftsQuery.isLoading,
    saveDraft: saveDraftMutation.mutateAsync,
    isSaving: saveDraftMutation.isPending,
    deleteDraft: deleteDraftMutation.mutate,
    isDeletingDraft: deleteDraftMutation.isPending,
    loadDraft,
  };
}
