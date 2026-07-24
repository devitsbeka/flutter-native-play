import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";
import { fetchPlayerFeedItems } from "@/hooks/usePlayerFeedItems";

export function useExplorePrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchExploreData = useCallback(() => {
    // Warm the default explore feed query (same key/fn as usePlayerFeedItems)
    const queryKey = ["player-feed-items", user?.id, "", "all", "recent"];

    // Check if data already exists and is fresh
    const existingData = queryClient.getQueryData(queryKey);
    if (existingData) return;

    // Prefetch in background
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchPlayerFeedItems(user?.id, "", "all", "recent"),
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
