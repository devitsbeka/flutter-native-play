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

    const idleCallback = 'requestIdleCallback' in window
      ? (window as any).requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 2000);

    const cancelCallback = 'cancelIdleCallback' in window
      ? (window as any).cancelIdleCallback
      : clearTimeout;

    const handle = idleCallback(() => {
      if (idlePrefetchDone.current) return;
      idlePrefetchDone.current = true;
      
      // Prefetch all route data in background
      prefetchAllTiers();
      prefetchShopData();
      prefetchExploreData();
    }, { timeout: 10000 });

    return () => cancelCallback(handle);
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
