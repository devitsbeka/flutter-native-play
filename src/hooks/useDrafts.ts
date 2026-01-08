import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useDrafts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const draftsQuery = useQuery({
    queryKey: ["collection-drafts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_drafts")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from("collection_drafts")
        .delete()
        .eq("id", draftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-drafts"] });
      toast.success("დრაფტი წაიშალა");
    },
    onError: () => {
      toast.error("დრაფტის წაშლა ვერ მოხერხდა");
    },
  });

  return {
    drafts: draftsQuery.data,
    isLoading: draftsQuery.isLoading,
    deleteDraft: deleteDraftMutation.mutate,
    isDeletingDraft: deleteDraftMutation.isPending,
  };
}
