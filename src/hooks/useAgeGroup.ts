import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * MyTrivia is a 13+ service, so there are two storable buckets: `teen` (13–17,
 * under the age of consent for personalised advertising) and `adult` (18+).
 *
 * The age gate offers a third option — under 13 — but it is a refusal, not a
 * bucket: it blocks account creation and is never written to a profile. See
 * `AgeGateStep`.
 *
 * A retired `child` value also exists in rows written before that option was
 * removed, which is why the predicates below read `string` rather than
 * `AgeGroup`: an unrecognised row must land on the *stricter* treatment,
 * never fall through to none.
 */
export type AgeGroup = "teen" | "adult";

/** The one value that opts a player out of restricted ad treatment. */
const ADULT = "adult";

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
 * **Only an explicit `"adult"` opts out.** Everything else — `teen`, the
 * retired `child`, `null`, `undefined`, a value this build has never heard of
 * — lands on the restricted treatment.
 *
 * It used to be the other way round: the predicate matched `teen` and `child`
 * and an unknown age fell through to no restriction at all. That is a default
 * nobody would choose deliberately. Anonymous players are created with
 * `signInAnonymously()` and never pass through onboarding, so their age group
 * is permanently `null` — every guest in the app was being treated as an
 * adult, served personalised ads with no rating cap, for guideline 5.1.4
 * purposes as if they had told us they were 18.
 *
 * The cost of the safe default is a slightly less valuable ad for a signed-out
 * adult. The cost of the unsafe one is a 13-year-old seeing adult-rated
 * personalised advertising, so the direction of the failure is not a close
 * call.
 */
export function isUnderAgeOfConsent(ageGroup: string | null | undefined): boolean {
  return ageGroup !== ADULT;
}

/**
 * Whether the age is known and is adult.
 *
 * Distinct from `!isUnderAgeOfConsent` only in intent: this is the question
 * asked before doing something an adult may opt into (the ATT prompt), where
 * "we do not know" must mean "do not ask".
 */
export function isKnownAdult(ageGroup: string | null | undefined): boolean {
  return ageGroup === ADULT;
}
