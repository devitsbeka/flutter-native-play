import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserScene {
  /** The still 16:9 scene image. */
  imageUrl: string;
  /** Seamless idle-loop video generated from the scene, if any — the
      homepage plays this instead of the still when present. */
  videoUrl: string | null;
}

// Last known scene per user, so a page refresh paints the scene instantly
// instead of flashing the fallback hero while the query round-trips.
const cacheKey = (userId: string) => `user_scene_${userId}`;

function readSceneCache(userId: string): UserScene | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as UserScene) : null;
  } catch {
    return null;
  }
}

function writeSceneCache(userId: string, scene: UserScene | null) {
  try {
    if (scene) localStorage.setItem(cacheKey(userId), JSON.stringify(scene));
    else localStorage.removeItem(cacheKey(userId));
  } catch {
    /* storage full/blocked — cache is best-effort */
  }
}

// The user's personalized 16:9 homepage scene, if they have generated one.
// Scenes are saved as `scene_<ts>.png` files in avatar_generations. The
// explicitly selected scene (is_current) wins; with no explicit selection
// the newest scene is shown. is_current flips are scoped per type (scene
// rows vs portrait rows), so switching the public mini avatar never
// changes the homepage background.
// The avatar studio can pin the default Trivia King loop instead of a
// generated scene; that choice is a local preference checked here.
function prefersDefaultScene(userId: string): boolean {
  try {
    return localStorage.getItem(`scene_pref_${userId}`) === "default";
  } catch {
    return false;
  }
}

export function useUserScene(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-scene", userId],
    queryFn: async (): Promise<UserScene | null> => {
      if (!userId) return null;
      if (prefersDefaultScene(userId)) return null;
      const { data } = await supabase
        .from("avatar_generations")
        .select("avatar_url, animated_avatar_url")
        .eq("user_id", userId)
        .like("avatar_url", "%/scene_%")
        .order("is_current", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const scene = data?.avatar_url
        ? { imageUrl: data.avatar_url, videoUrl: data.animated_avatar_url || null }
        : null;
      writeSceneCache(userId, scene);
      return scene;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    // Painted immediately on mount while the fresh copy loads
    placeholderData: () => (userId && !prefersDefaultScene(userId) ? readSceneCache(userId) : null),
  });
}
