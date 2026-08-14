import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { newCategoryIds } from "@/utils/newCategory";

/**
 * The categories to put a "New!" badge on — see `utils/newCategory.ts` for
 * what counts as new and why it changed.
 *
 * `user_category_last_seen` is still the record of what a player has opened;
 * only what the app does with it changed. It used to be compared against a
 * category's level count, which is what made the badge mean "more levels
 * than last time"; now the row's existence just says "you have been here".
 */
async function fetchNewCategories(userId: string): Promise<Set<string>> {
  const { data: seenRows, error: seenError } = await supabase
    .from("user_category_last_seen")
    .select("category_id")
    .eq("user_id", userId);

  if (seenError) throw seenError;

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, created_at")
    .eq("is_active", true);

  if (categoriesError) throw categoriesError;

  const seen = new Set((seenRows || []).map((row) => row.category_id));
  return newCategoryIds(
    (categories || []).map((c) => ({ id: c.id, createdAt: c.created_at })),
    seen,
    Date.now(),
  );
}

export function useNewCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: newCategories = new Set<string>(), isLoading: loading } = useQuery({
    queryKey: ["new-categories", user?.id],
    queryFn: () => fetchNewCategories(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // new categories are rare
    gcTime: 10 * 60 * 1000,
  });

  const isNewCategory = useCallback(
    (categoryId: string) => newCategories.has(categoryId),
    [newCategories],
  );

  /** Opening a category is what marks it seen, and drops its badge. */
  const markCategorySeen = useCallback(
    async (categoryId: string, currentTotalLevels: number) => {
      if (!user) return;

      try {
        await supabase.from("user_category_last_seen").upsert(
          {
            user_id: user.id,
            category_id: categoryId,
            last_seen_total_levels: currentTotalLevels,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,category_id" },
        );

        // Optimistically remove from cache
        queryClient.setQueryData<Set<string>>(["new-categories", user.id], (prev) => {
          if (!prev) return new Set();
          const next = new Set(prev);
          next.delete(categoryId);
          return next;
        });
      } catch (error) {
        console.error("Error marking category as seen:", error);
      }
    },
    [user, queryClient],
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["new-categories", user?.id] });
  }, [queryClient, user?.id]);

  return { isNewCategory, newCategories, loading, markCategorySeen, refetch };
}
