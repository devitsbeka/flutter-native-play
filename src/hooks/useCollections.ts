import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMyCollections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-collections", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("quiz_collections")
        // Include rounds count (number of quizzes in the collection)
        .select("*, rounds:user_quiz_posts(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching my collections:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useCollectionQuizzes(collectionId: string | null) {
  return useQuery({
    queryKey: ["collection-quizzes", collectionId],
    queryFn: async () => {
      if (!collectionId) return [];

      const { data, error } = await supabase
        .from("user_quiz_posts")
        .select("*")
        .eq("collection_id", collectionId)
        .order("round_number", { ascending: true });

      if (error) {
        console.error("Error fetching collection quizzes:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!collectionId,
  });
}
