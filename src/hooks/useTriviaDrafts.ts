import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { t as tStandalone } from "@/contexts/LanguageContext";

export interface TriviaDraftData {
  id: string;
  user_id: string;
  title: string | null;
  questions: any[];
  draft_type: 'trivia' | 'personal';
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
      questions,
      draft_type = 'trivia'
    }: { 
      draftId?: string; 
      title: string | null; 
      questions: any[];
      draft_type?: 'trivia' | 'personal';
    }) => {
      if (!user) throw new Error("Not authenticated");

      const draftData = {
        user_id: user.id,
        title,
        questions,
        draft_type,
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
      toast.success(tStandalone("extra.draftDeleted"));
    },
    onError: () => {
      toast.error(tStandalone("extra.draftDeleteFailed"));
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
      toast.error(tStandalone("extra.draftLoadFailed"));
      return null;
    }

    return data as TriviaDraftData;
  };

  /**
   * The draft has become a real trivia, so it stops being a draft.
   *
   * Silent, unlike deleteDraft: nobody threw this away, it graduated, and
   * "draft deleted" landing right after "saved!" reads like something went
   * wrong. Failure is swallowed for the same reason — the trivia is saved
   * either way, and a leftover draft is a great deal better than an error
   * about one.
   */
  const consumeDraft = async (draftId: string) => {
    try {
      await supabase.from("trivia_drafts").delete().eq("id", draftId);
    } catch (error) {
      console.error("Could not clear the saved draft:", error);
    }
    queryClient.invalidateQueries({ queryKey: ["trivia-drafts"] });
  };

  return {
    drafts: draftsQuery.data,
    isLoading: draftsQuery.isLoading,
    saveDraft: saveDraftMutation.mutateAsync,
    isSaving: saveDraftMutation.isPending,
    deleteDraft: deleteDraftMutation.mutate,
    isDeletingDraft: deleteDraftMutation.isPending,
    loadDraft,
    consumeDraft,
  };
}
