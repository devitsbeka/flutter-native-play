import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useTotalStars() {
  const { user } = useAuth();

  const { data: totalStars = 0, isLoading } = useQuery({
    queryKey: ["total-stars", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { data, error } = await supabase
        .from("user_level_progress")
        .select("stars_earned")
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching total stars:", error);
        return 0;
      }
      
      return data?.reduce((sum, record) => sum + (record.stars_earned || 0), 0) || 0;
    },
    enabled: !!user,
    staleTime: 30000,
  });

  return { totalStars, isLoading };
}
