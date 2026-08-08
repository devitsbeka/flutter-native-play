import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// The user's personalized 16:9 homepage scene, if they have generated one.
// Scenes are saved as `scene_<ts>.png` files and recorded as the current row
// in avatar_generations — the filename marker distinguishes them from the
// square portrait avatars older generations produced.
export function useUserScene(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-scene", userId],
    queryFn: async (): Promise<string | null> => {
      if (!userId) return null;
      const { data } = await supabase
        .from("avatar_generations")
        .select("avatar_url")
        .eq("user_id", userId)
        .eq("is_current", true)
        .maybeSingle();
      const url = data?.avatar_url || null;
      return url && url.includes("/scene_") ? url : null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
