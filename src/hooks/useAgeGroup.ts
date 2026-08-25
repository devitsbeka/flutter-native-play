import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * MyTrivia is a 13+ service, so there are two buckets: `teen` (13–17, under
 * the age of consent for personalised advertising) and `adult` (18+).
 *
 * There used to be a third, `child`, behind an "Under 16" option — see the
 * note in `AgeGateStep`. Rows written before that option was removed still
 * carry the string, which is why the predicates below read `string` rather
 * than `AgeGroup` and still recognise it: a legacy row must land on the
 * *stricter* treatment, never fall through to none.
 */
export type AgeGroup = "teen" | "adult";

/** Age groups this app still has to interpret, including the retired one. */
const LEGACY_CHILD = "child";

/**
 * Hook to manage user age group.
 */
export function useAgeGroup() {
  const { user } = useAuth();

  const saveAgeGroup = useCallback(async (ageGroup: AgeGroup) => {
    if (!user?.id) return;
    await supabase
      .from("profiles")
      .update({ age_group: ageGroup })
      .eq("user_id", user.id);
  }, [user?.id]);

  return { saveAgeGroup };
}

/**
 * Whether under-age-of-consent ad treatment applies: no personalised ads, and
 * ad content capped below the adult rating.
 *
 * True for every non-adult value, the retired `child` included — an unknown
 * or missing age is treated as adult, which is what an unauthenticated
 * visitor is assumed to be until they tell us otherwise.
 */
export function isUnderAgeOfConsent(ageGroup: string | null | undefined): boolean {
  return ageGroup === "teen" || ageGroup === LEGACY_CHILD;
}
