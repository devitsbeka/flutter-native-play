import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { t as tStandalone } from "@/contexts/LanguageContext";

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch favorites from database
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      // Load from localStorage for guests
      const stored = localStorage.getItem("guestFavorites");
      if (stored) {
        try {
          setFavorites(new Set(JSON.parse(stored)));
        } catch {
          setFavorites(new Set());
        }
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("category_id")
        .eq("user_id", user.id);

      if (error) throw error;

      // Convert UUIDs to Set
      setFavorites(new Set(data?.map((f) => f.category_id) || []));
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(
    async (categoryId: string) => {
      const isFavorite = favorites.has(categoryId);

      // Optimistic update
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFavorite) {
          next.delete(categoryId);
        } else {
          next.add(categoryId);
        }
        return next;
      });

      if (!user) {
        // Save to localStorage for guests
        const newFavorites = new Set(favorites);
        if (isFavorite) {
          newFavorites.delete(categoryId);
        } else {
          newFavorites.add(categoryId);
        }
        localStorage.setItem(
          "guestFavorites",
          JSON.stringify([...newFavorites])
        );
        return;
      }

      try {
        if (isFavorite) {
          const { error } = await supabase
            .from("user_favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("category_id", categoryId);
          
          if (error) throw error;
        } else {
          const { error } = await supabase.from("user_favorites").insert({
            user_id: user.id,
            category_id: categoryId,
          });
          
          if (error) throw error;
        }
      } catch (error: any) {
        console.error("Error toggling favorite:", error);
        toast.error(tStandalone("extra.favUpdateFailed"));
        // Revert optimistic update
        setFavorites((prev) => {
          const next = new Set(prev);
          if (isFavorite) {
            next.add(categoryId);
          } else {
            next.delete(categoryId);
          }
          return next;
        });
      }
    },
    [favorites, user]
  );

  const isFavorite = useCallback(
    (categoryId: string) => favorites.has(categoryId),
    [favorites]
  );

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
