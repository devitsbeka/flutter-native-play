import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import posthog from "posthog-js";
import { useAuth } from "@/contexts/AuthContext";

const POSTHOG_KEY = "phc_mJKmSyJCq92bAxkvo7NZmdP7UZP79zqmJ7AX9E5vFYA";
const POSTHOG_HOST = "https://us.i.posthog.com";

let initialized = false;

function initPostHog() {
  if (initialized) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // we handle SPA pageviews manually
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

/** Tracks SPA route changes as $pageview events */
function usePageviewTracker() {
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    // fire on every route change (including first render)
    posthog.capture("$pageview", { $current_url: window.location.href });
    prevPath.current = location.pathname;
  }, [location.pathname, location.search]);
}

/** Identifies / resets PostHog user when auth state changes */
function useIdentifyUser() {
  const { user, profile } = useAuth();
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
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
      });
      identifiedRef.current = user.id;
    } else if (!user && identifiedRef.current) {
      posthog.reset();
      identifiedRef.current = null;
    }
  }, [user, profile]);
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  usePageviewTracker();
  useIdentifyUser();

  return <>{children}</>;
}
