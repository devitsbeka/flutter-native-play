import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mascotById, parseMascotId, type Mascot, type MascotId } from "@/config/mascots";

/**
 * Which mascot backs the signed-in player's home screen.
 *
 * The choice lives in `profiles.home_mascot`, so it follows the account
 * between the phone and the web. A copy is kept in localStorage for two
 * reasons: a page refresh paints the right scene at once instead of
 * flashing the King while the query round-trips, and the column is added by
 * a migration that is applied by hand — until it is, the database answers
 * with an error and the local copy is the choice.
 */
const cacheKey = (userId: string) => `home_mascot_${userId}`;

export function readMascotCache(userId: string): MascotId | null {
  try {
    return parseMascotId(localStorage.getItem(cacheKey(userId)));
  } catch {
    return null;
  }
}

export function writeMascotCache(userId: string, id: MascotId | null) {
  try {
    if (id) localStorage.setItem(cacheKey(userId), id);
    else localStorage.removeItem(cacheKey(userId));
  } catch {
    /* storage full/blocked — the cache is best-effort */
  }
}

/**
 * The stored choice, resolved from what the database said and what this
 * device remembers. Exported for the test; the hook is the way to use it.
 *
 * The local copy wins over an empty column: a pick made while the column
 * was missing was saved here and nowhere else, and forgetting it on the
 * next fetch would silently undo the tap.
 */
export function resolveStoredMascot(
  fromDatabase: { data: unknown; error: unknown },
  cached: MascotId | null,
): MascotId | null {
  if (fromDatabase.error) return cached;
  return parseMascotId(fromDatabase.data) ?? cached;
}

const queryKey = (userId: string | undefined) => ["home-mascot", userId] as const;

export interface HomeMascotState {
  /** The chosen mascot, or null when the player has not picked one. */
  mascotId: MascotId | null;
  mascot: Mascot | null;
  /** True until the first answer — from the cache or the database. */
  isLoading: boolean;
  setMascot: (id: MascotId) => Promise<void>;
}

export function useHomeMascot(userId: string | undefined): HomeMascotState {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKey(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<MascotId | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("home_mascot")
        .eq("user_id", userId)
        .maybeSingle();
      const id = resolveStoredMascot({ data: data?.home_mascot, error }, readMascotCache(userId));
      writeMascotCache(userId, id);
      return id;
    },
    // Painted immediately on mount while the fresh copy loads. `undefined`
    // (not null) when nothing is cached, so the query stays pending rather
    // than reporting "no choice" before it has asked.
    placeholderData: () => (userId ? readMascotCache(userId) ?? undefined : undefined),
  });

  const setMascot = useCallback(
    async (id: MascotId) => {
      if (!userId) return;
      // Locally first: the home screen changes on the next paint, whatever
      // the network does.
      writeMascotCache(userId, id);
      queryClient.setQueryData(queryKey(userId), id);
      const { error } = await supabase
        .from("profiles")
        .update({ home_mascot: id })
        .eq("user_id", userId);
      if (error) {
        // The migration adding the column may not be applied yet; the local
        // copy carries the choice on this device until it is.
        console.warn("home_mascot not saved to the profile:", error.message);
      }
    },
    [userId, queryClient],
  );

  const mascotId = query.data ?? null;
  return {
    mascotId,
    mascot: mascotById(mascotId),
    isLoading: !!userId && query.data === undefined,
    setMascot,
  };
}
