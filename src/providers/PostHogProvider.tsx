import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import posthog from "posthog-js";
import { useAuth } from "@/contexts/AuthContext";
import { fbTrackPageView } from "@/lib/fbpixel";

const POSTHOG_KEY = "phc_mJKmSyJCq92bAxkvo7NZmdP7UZP79zqmJ7AX9E5vFYA";
const POSTHOG_HOST = "https://us.i.posthog.com";

// Initialize synchronously at module level so it's ready before any hooks fire
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,
  capture_pageleave: true,
  autocapture: true,
  persistence: "localStorage+cookie",
});

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

  useEffect(() => {
    // Don't set any properties until auth state is resolved
    if (loading) return;

    if (user && profile && identifiedRef.current !== user.id) {
      posthog.identify(user.id, {
        $name: profile.nickname,
        $email: user.email ?? undefined,
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
    } else if (!user && identifiedRef.current) {
      posthog.reset();
      posthog.register({ user_type: "guest" });
      posthog.setPersonProperties({ user_type: "guest" });
      identifiedRef.current = null;
    } else if (!user && !identifiedRef.current) {
      posthog.register({ user_type: "guest" });
      posthog.setPersonProperties({ user_type: "guest" });
    }
  }, [user, profile, loading]);
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  usePageviewTracker();
  useIdentifyUser();

  return <>{children}</>;
}
