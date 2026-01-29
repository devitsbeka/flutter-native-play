import { useCallback, useEffect, useRef } from "react";
import { useLeaderboardPrefetch } from "./useLeaderboardPrefetch";
import { useShopPrefetch } from "./useShopPrefetch";
import { useExplorePrefetch } from "./useExplorePrefetch";

/**
 * Unified hook for navigation prefetching.
 * - Eagerly prefetches all route data during browser idle time
 * - Call prefetchRoute on hover/touchstart for immediate prefetching
 */
export function useNavigationPrefetch() {
  const { prefetchAllTiers } = useLeaderboardPrefetch();
  const { prefetchShopData, preloadShopPage } = useShopPrefetch();
  const { prefetchExploreData, preloadExplorePage } = useExplorePrefetch();
  const idlePrefetchDone = useRef(false);

  // Idle-time prefetching - prefetch all route data when browser is idle
  useEffect(() => {
    if (idlePrefetchDone.current) return;

    let handle: number | ReturnType<typeof setTimeout>;
    
    if ('requestIdleCallback' in window) {
      handle = (window as any).requestIdleCallback(() => {
        if (idlePrefetchDone.current) return;
        idlePrefetchDone.current = true;
        prefetchAllTiers();
        prefetchShopData();
        prefetchExploreData();
      }, { timeout: 10000 });
    } else {
      handle = setTimeout(() => {
        if (idlePrefetchDone.current) return;
        idlePrefetchDone.current = true;
        prefetchAllTiers();
        prefetchShopData();
        prefetchExploreData();
      }, 2000);
    }

    return () => {
      if ('cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      }
    };
  }, [prefetchAllTiers, prefetchShopData, prefetchExploreData]);

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
