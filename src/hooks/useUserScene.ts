import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// The user's personalized 16:9 homepage scene, if they have generated one.
// Scenes are saved as `scene_<ts>.png` files in avatar_generations. The
// explicitly selected scene (is_current) wins; with no explicit selection
// the newest scene is shown. is_current flips are scoped per type (scene
// rows vs portrait rows), so switching the public mini avatar never
// changes the homepage background.
export function useUserScene(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-scene", userId],
    queryFn: async (): Promise<string | null> => {
      if (!userId) return null;
      const { data } = await supabase
        .from("avatar_generations")
        .select("avatar_url")
        .eq("user_id", userId)
        .like("avatar_url", "%/scene_%")
        .order("is_current", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.avatar_url || null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
