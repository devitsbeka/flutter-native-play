import { useCallback } from "react";
import { useLeaderboardPrefetch } from "./useLeaderboardPrefetch";
import { useShopPrefetch } from "./useShopPrefetch";
import { useExplorePrefetch } from "./useExplorePrefetch";

/**
 * Unified hook for navigation prefetching.
 * Call prefetchRoute on hover/touchstart of navigation items
 * to preload both the page chunk and its data.
 */
export function useNavigationPrefetch() {
  const { prefetchAllTiers } = useLeaderboardPrefetch();
  const { prefetchShopData, preloadShopPage } = useShopPrefetch();
  const { prefetchExploreData, preloadExplorePage } = useExplorePrefetch();

  const prefetchRoute = useCallback(
    (path: string) => {
      switch (path) {
        case "/leaderboards":
          prefetchAllTiers();
          import("@/pages/Leaderboards");
          break;
        case "/power-ups":
          prefetchShopData();
          preloadShopPage();
          break;
        case "/team":
          prefetchExploreData();
          preloadExplorePage();
          break;
        case "/discover":
          prefetchExploreData();
          import("@/pages/Discover");
          break;
        case "/profile":
          import("@/pages/Profile");
          break;
        default:
          break;
      }
    },
    [prefetchAllTiers, prefetchShopData, preloadShopPage, prefetchExploreData, preloadExplorePage]
  );

  return { prefetchRoute };
}
