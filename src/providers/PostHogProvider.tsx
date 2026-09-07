import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import posthog from "posthog-js";
import { useAuth } from "@/contexts/AuthContext";
import { fbTrackPageView } from "@/lib/fbpixel";
import { analyticsConsentAllowed, subscribeToAdConsent } from "@/native/adConsent";
import { useConsentOrchestration } from "@/native/useConsentOrchestration";

const POSTHOG_KEY = "phc_mJKmSyJCq92bAxkvo7NZmdP7UZP79zqmJ7AX9E5vFYA";
const POSTHOG_HOST = "https://us.i.posthog.com";

// Read Supabase session from localStorage to bootstrap PostHog identity
// This runs synchronously BEFORE posthog.init() so the very first event
// already carries the correct user ID — no anonymous-person race condition.
function getBootstrapIdentity(): { userId: string; displayName: string | undefined } | null {
  try {
    const storageKey = 'sb-sqwpzezkhpqkdyltvsim-auth-token';
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const userId = parsed?.user?.id;
    if (!userId) return null;

    const lastUser = localStorage.getItem('mytrivia_last_user');
    const lastUserData = lastUser ? JSON.parse(lastUser) : null;
    const meta = parsed?.user?.user_metadata;
    const displayName = lastUserData?.nickname
      || meta?.nickname || meta?.full_name || meta?.name;

    // Always return a fallback name - never undefined
    const fallbackName = parsed?.user?.email?.split('@')[0] || 'Player';
    return { userId, displayName: displayName || fallbackName };
  } catch {
    return null;
  }
}

const bootstrapIdentity = getBootstrapIdentity();

/**
 * Initialised at module level, but **capturing nothing until consent exists.**
 *
 * This used to be a bare `posthog.init()` at module scope with
 * `autocapture: true`, `person_profiles: "always"` and `capture_pageleave:
 * true`, bootstrapping an identified distinct_id out of the Supabase session
 * in localStorage — so the first events, carrying `$email`, nickname, country,
 * coins, gems and games played, went out before the app had asked anybody
 * anything. Identical for a player who had denied ATT and for an EEA player
 * with no consent record of any kind.
 *
 * `opt_out_capturing_by_default` is the supported way to keep the SDK's setup
 * where it belongs — before any hook fires, so no event is lost to a race —
 * while sending nothing. `useAnalyticsConsent()` below opts in once the
 * consent flow in `native/adConsent.ts` has an answer that permits it.
 *
 * Two further deliberate settings:
 *
 *   - `disable_session_recording: true` was **absent**, which left recording
 *     under a server-side project switch. Flipping that switch would have
 *     started capturing typed input from an app whose privacy manifest
 *     declares no such thing. It is now off in the client, where it is
 *     visible in review.
 *   - `sanitize_properties` drops `$ip`. PostHog derives geography from it,
 *     and a coarse country code is already sent as a person property.
 */
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
  autocapture: true,
  persistence: "localStorage+cookie",
  person_profiles: "always",
  opt_out_capturing_by_default: true,
  disable_session_recording: true,
  sanitize_properties: (properties) => ({ ...properties, $ip: null }),
  bootstrap: bootstrapIdentity
    ? { distinctID: bootstrapIdentity.userId, isIdentifiedID: true }
    : undefined,
});

// Report crashes, not just behaviour.
//
// The React boundary at the root catches render errors; this catches the rest -
// a rejected promise in a realtime handler, a throw inside a setTimeout, the
// kind of failure that leaves the UI stuck rather than blank. Without it those
// are only visible to a developer holding the phone.
//
// capture_console_errors is deliberately OFF: this codebase uses console.error
// as ordinary logging (failed regen writes, swallowed insert warnings), and
// promoting all of that to exception events would bury the real crashes.
posthog.startExceptionAutocapture({
  capture_unhandled_errors: true,
  capture_unhandled_rejections: true,
  capture_console_errors: false,
});

// If bootstrapped, immediately identify so the person profile is created with correct properties
if (bootstrapIdentity) {
  posthog.identify(bootstrapIdentity.userId, {
    name: bootstrapIdentity.displayName,
    $name: bootstrapIdentity.displayName,
    user_type: "registered",
  });
  posthog.register({ user_type: "registered" });
}

/**
 * Opts in and out of capturing as the consent answer changes.
 *
 * The answer comes from the same UMP flow that governs ads: consent not
 * required in this jurisdiction, or required and given. "Not asked yet" is not
 * consent, and neither is a refusal — both leave the SDK opted out, which is
 * how it starts.
 */
function useAnalyticsConsent() {
  useEffect(() => {
    const apply = () => {
      const allowed = analyticsConsentAllowed();
      if (allowed && !posthog.has_opted_in_capturing()) {
        // No `$opt_in` event: it would be the first thing a player who has
        // just consented sees in their own data, and it says nothing.
        posthog.opt_in_capturing({ captureEventName: false });
      } else if (!allowed && !posthog.has_opted_out_capturing()) {
        posthog.opt_out_capturing();
      }
    };

    apply();
    return subscribeToAdConsent(apply);
  }, []);
}

/** Tracks SPA route changes as $pageview events */
function usePageviewTracker() {
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    posthog.capture("$pageview", { $current_url: window.location.href });
    fbTrackPageView();
    prevPath.current = location.pathname;
  }, [location.pathname, location.search]);
}

/** Identifies / resets PostHog user when auth state changes */
function useIdentifyUser() {
  const { user, profile, loading } = useAuth();
  const identifiedRef = useRef<string | null>(null);
  const initialIdentifyDoneRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Don't set any properties until auth state is resolved
    if (loading) return;

    const isRealEmail = user?.email && !user.email.endsWith('@mytrivia.local');

    // Cancel any pending reset if user is present (token refresh resolved)
    if (user && resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    if (user && profile && identifiedRef.current !== user.id) {
      // Full identify with all profile properties
      posthog.identify(user.id, {
        name: profile.nickname,
        $name: profile.nickname,
        $email: isRealEmail ? user.email : undefined,
        nickname: profile.nickname,
        country_code: profile.country_code,
        coins: profile.coins,
        gems: profile.gems,
        games_played: profile.games_played,
        current_streak: profile.current_streak,
        best_streak: profile.best_streak,
        user_type: "registered",
      });
      posthog.register({ user_type: "registered" });
      identifiedRef.current = user.id;
      initialIdentifyDoneRef.current = true;
    } else if (user && !profile && !initialIdentifyDoneRef.current) {
      // Early identify with user ID + nickname from auth metadata
      const meta = user.user_metadata as any;
      const metaNickname = meta?.nickname || meta?.full_name || meta?.name || user.email?.split('@')[0] || 'Player';
      posthog.identify(user.id, {
        $email: isRealEmail ? user.email : undefined,
        name: metaNickname,
        $name: metaNickname,
        user_type: "registered",
      });
      posthog.register({ user_type: "registered" });
      initialIdentifyDoneRef.current = true;
    } else if (!user && (identifiedRef.current || initialIdentifyDoneRef.current)) {
      // User was previously identified — delay reset to survive token refresh flickers
      if (!resetTimerRef.current) {
        resetTimerRef.current = setTimeout(() => {
          posthog.reset();
          posthog.register({ user_type: "guest" });
          posthog.setPersonProperties({
            name: "Guest",
            $name: "Guest",
            user_type: "guest",
          });
          identifiedRef.current = null;
          initialIdentifyDoneRef.current = false;
          resetTimerRef.current = null;
        }, 3000);
      }
    } else if (!user && !identifiedRef.current) {
      // True guest — only set super property, don't overwrite person props
      // (bootstrap identity from localStorage handles returning users)
      posthog.register({ user_type: "guest" });
    }
  }, [user, profile, loading]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Sits here because this provider is mounted directly inside AuthProvider
  // and wraps the whole app — see the note in useConsentOrchestration. It
  // resolves the age that gates the ATT prompt and the UMP flow whose answer
  // useAnalyticsConsent below is waiting for.
  useConsentOrchestration();
  useAnalyticsConsent();
  usePageviewTracker();
  useIdentifyUser();

  return <>{children}</>;
}
