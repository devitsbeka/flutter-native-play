import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Surfaces that can play an animated avatar (the nav profile circle plays it
// on hover) read profile.animated_avatar_url. That video belongs to whichever
// face it was generated from — so after a new avatar is saved, a leftover
// animation makes the avatar visibly change into the PREVIOUS person on hover.
//
// New saves clear the field, but profiles that predate that fix still carry a
// stale pairing. This heals them: the animation is kept only when an
// avatar_generations row pairs it with the avatar the profile is using now.
export function StaleAnimationCleanup() {
  const { user, profile, updateProfile } = useAuth();
  const checked = useRef<string | null>(null);

  useEffect(() => {
    const animated = profile?.animated_avatar_url;
    const current = profile?.avatar_url;
    if (!user || !animated) return;
    // Re-check whenever the pairing itself changes, not on every render
    const key = `${current || ""}|${animated}`;
    if (checked.current === key) return;
    checked.current = key;

    (async () => {
      try {
        if (!current) {
          await updateProfile({ animated_avatar_url: null } as any);
          return;
        }
        const { data, error } = await supabase
          .from("avatar_generations")
          .select("id")
          .eq("user_id", user.id)
          .eq("avatar_url", current)
          .eq("animated_avatar_url", animated)
          .limit(1)
          .maybeSingle();

        // Only drop it on a definitive "no such pairing" — a failed read must
        // never wipe a legitimate animation.
        if (!error && !data) {
          await updateProfile({ animated_avatar_url: null } as any);
        }
      } catch (e) {
        console.error("[StaleAnimationCleanup]", e);
      }
    })();
  }, [user, profile?.avatar_url, profile?.animated_avatar_url, updateProfile]);

  return null;
}
