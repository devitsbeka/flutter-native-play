import { useQuery } from "@tanstack/react-query";
import { fetchCrestPool } from "@/utils/roomCrests";

/**
 * The shared, ordered icon pool a room deals its fallback face from — the
 * same deck the Battle crests use (utils/roomCrests), fetched once and cached
 * for the session so the search strip and every card agree on a room's icon.
 */
export function useRoomIconPool(): string[] {
  const { data } = useQuery({
    queryKey: ["room-icon-pool"],
    queryFn: fetchCrestPool,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data ?? [];
}
