import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// The user's personalized 16:9 homepage scene, if they have generated one.
// Scenes are saved as `scene_<ts>.png` files in avatar_generations; the
// newest scene row wins regardless of is_current, so switching the public
// mini avatar on the profile never changes the homepage background.
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
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.avatar_url || null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
