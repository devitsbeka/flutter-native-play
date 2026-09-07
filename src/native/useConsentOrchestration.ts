import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { declareAgeGroup } from "@/native/trackingConsent";
import { ensureAdConsent } from "@/native/adConsent";
import { isUnderAgeOfConsent } from "@/hooks/useAgeGroup";

/**
 * The one place that knows the player's age and tells the consent flows.
 *
 * There are three consent questions in this app and each one used to be asked
 * by whichever piece of code happened to run first:
 *
 *   - **ATT** was primed on the first painted frame of a cold start, before
 *     the app knew whether it was talking to an adult (guideline 5.1.4);
 *   - **UMP / GDPR** was never asked at all, despite the framework shipping in
 *     the binary — see `adConsent.ts`;
 *   - **analytics** initialised at module scope, for everyone, unconditionally.
 *
 * All three need the same input — who is this, and how old are they — which
 * arrives from `AuthContext` once the profile has loaded. So it is resolved
 * here, once, and pushed out.
 *
 * ## Where this is mounted
 *
 * From `PostHogProvider`, which sits directly inside `AuthProvider` and wraps
 * the whole app, so it runs on every launch on every route. `NativeBridge`
 * cannot do it: it is mounted in `main.tsx` above `AuthProvider` and has no
 * session to read.
 *
 * ## Ordering
 *
 * `loading` is respected. Declaring an age of `null` while auth is still
 * resolving would tell the ATT flow "guest, do not ask" a beat before the
 * profile arrives, and telling the UMP flow the wrong `tagForUnderAgeOfConsent`
 * means asking Google the wrong question and having to ask it again.
 */
export function useConsentOrchestration() {
  const { profile, loading } = useAuth();
  const ageGroup = (profile as { age_group?: string | null } | null)?.age_group ?? null;

  useEffect(() => {
    // Still resolving. An unknown age is a real answer once auth has settled
    // (that is a guest) but not before.
    if (loading) return;

    // ATT: prompts only for an explicit adult, and only once the launch has
    // primed. Anything else is a no-op.
    declareAgeGroup(ageGroup);

    // UMP: runs on every native launch regardless of whether this session
    // ever reaches a screen that loads an ad, because `analyticsConsentAllowed`
    // and every ad path depend on its answer. No-ops on the web.
    void ensureAdConsent({ underAgeOfConsent: isUnderAgeOfConsent(ageGroup) });
  }, [ageGroup, loading]);
}
