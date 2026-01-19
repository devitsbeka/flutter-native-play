import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

async function fetchExploreData(userId?: string) {
  // Fetch posts and profiles in parallel
  const [postsResult, profilesResult, friendshipsResult] = await Promise.all([
    supabase
      .from("user_quiz_posts")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("user_id, nickname, avatar_url, country_code")
      .limit(200),
    userId
      ? supabase
          .from("friendships")
          .select("user_id, friend_id, status")
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    posts: postsResult.data || [],
    profiles: profilesResult.data || [],
    friendships: friendshipsResult.data || [],
  };
}

export function useExplorePrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchExploreData = useCallback(() => {
    // Check if data already exists and is fresh
    const existingData = queryClient.getQueryData(["exploreData", ""]);
    if (existingData) return;

    // Prefetch in background
    queryClient.prefetchQuery({
      queryKey: ["exploreData", ""],
      queryFn: () => fetchExploreData(user?.id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [queryClient, user?.id]);

  // Preload page chunks
  const preloadExplorePage = useCallback(() => {
    import("@/pages/TeamV2");
    import("@/pages/Discover");
  }, []);

  return {
    prefetchExploreData,
    preloadExplorePage,
  };
}
