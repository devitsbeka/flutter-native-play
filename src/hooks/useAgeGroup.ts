import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AgeGroup = "child" | "teen" | "adult";

/**
 * Hook to manage user age group.
 * Returns whether the user is a child (for ad targeting purposes).
 */
export function useAgeGroup() {
  const { user } = useAuth();

  const saveAgeGroup = useCallback(async (ageGroup: AgeGroup) => {
    if (!user?.id) return;
    await supabase
      .from("profiles")
      .update({ age_group: ageGroup } as any)
      .eq("user_id", user.id);
  }, [user?.id]);

  return { saveAgeGroup };
}

/**
 * Check if child-directed ad treatment should be applied.
 * Called from AdMob initialization.
 */
export function isChildUser(ageGroup: string | null | undefined): boolean {
  return ageGroup === "child";
}

/**
 * Check if under-age-of-consent treatment should be applied (under 18 in EU).
 */
export function isUnderAgeOfConsent(ageGroup: string | null | undefined): boolean {
  return ageGroup === "child" || ageGroup === "teen";
}
