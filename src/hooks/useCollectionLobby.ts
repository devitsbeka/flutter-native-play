import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CollectionDetails {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  cover_gradient: string;
  plays_count: number | null;
  likes_count: number | null;
  saves_count: number | null;
  created_at: string | null;
  user_id: string;
  is_public: boolean;
  hashtags: string[] | null;
}

export interface CreatorProfile {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
}

export interface CollectionRoundRow {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  hashtags: string[] | null;
  cover_image: string | null;
  cover_gradient: string;
  question_count: number;
  answer_format: string;
  likes_count: number | null;
  saves_count: number | null;
  plays_count: number | null;
  questions: any[] | null;
  is_public: boolean;
  created_at: string | null;
  round_number: number | null;
}

const CACHE_OPTIONS = {
  staleTime: 30_000,
  gcTime: 5 * 60 * 1000,
};

export function useCollectionLobby(collectionId: string | undefined) {
  return useQuery({
    queryKey: ["collection-lobby", collectionId],
    queryFn: async () => {
      if (!collectionId) return null;

      const [{ data: collection, error: collError }, { data: rounds, error: roundsError }] =
        await Promise.all([
          supabase
            .from("quiz_collections")
            .select("*")
            .eq("id", collectionId)
            .single(),
          supabase
            .from("user_quiz_posts")
            .select("*")
            .eq("collection_id", collectionId)
            .order("round_number", { ascending: true }),
        ]);

      if (collError) throw collError;
      if (roundsError) throw roundsError;

      const { data: creator } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url")
        .eq("user_id", collection.user_id)
        .single();

      return {
        collection: collection as CollectionDetails,
        creator: (creator as CreatorProfile | null) || null,
        rounds: (rounds as CollectionRoundRow[]) || [],
      };
    },
    enabled: !!collectionId,
    ...CACHE_OPTIONS,
  });
}
