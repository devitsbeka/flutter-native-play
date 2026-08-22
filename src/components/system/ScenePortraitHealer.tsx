import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { healScenePortraitIfNeeded } from "@/utils/portraitHeal";

/**
 * Quietly repairs the signed-in person's circle avatar when it is a full
 * scene (the guardrail-window generation bug) — regenerated from the source
 * image already in the bucket, no re-upload, no button. See portraitHeal.ts
 * for the exact conditions; until the fixed generate-avatar function is
 * deployed this stores nothing and retries another session.
 */
export function ScenePortraitHealer() {
  const { user, profile, updateProfile } = useAuth();
  const healing = useRef(false);
  const avatarUrl = profile?.avatar_url;

  useEffect(() => {
    if (!user?.id || !avatarUrl || healing.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    // Let app start-up traffic settle first; the heal is never urgent.
    const timer = setTimeout(() => {
      healing.current = true;
      void healScenePortraitIfNeeded(user.id, avatarUrl, (url) =>
        updateProfile({ avatar_url: url }),
      ).finally(() => {
        healing.current = false;
      });
    }, 6000);
    return () => clearTimeout(timer);
    // updateProfile is stable enough for this once-per-avatar effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, avatarUrl]);

  return null;
}
