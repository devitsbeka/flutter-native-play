import { useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";

/**
 * Public Profile Page
 *
 * This page handles direct navigation to /profile/:userId
 * It opens the PlayerProfileModal and provides a fallback UI
 */
export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { openProfile, currentProfileUserId, closeProfile } = usePlayerProfile();
  const hasOpened = useRef(false);

  // Open the profile modal BEFORE the browser paints — with a regular
  // effect the route's fallback page flashed for a frame or two first
  useLayoutEffect(() => {
    if (userId && userId !== currentProfileUserId) {
      hasOpened.current = true;
      openProfile(userId);
    }
  }, [userId, openProfile, currentProfileUserId]);

  // When modal is closed, navigate back
  useEffect(() => {
    // Only navigate back if we previously opened a profile and now it's closed
    if (!currentProfileUserId && hasOpened.current) {
      hasOpened.current = false;
      // Small delay to allow modal close animation
      const timer = setTimeout(() => {
        // If there's real history to go back to, use it; otherwise go home
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/", { replace: true });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentProfileUserId, navigate]);

  // The modal opens over this route pre-paint, so the page itself renders
  // nothing — the global background shows through instead of a skeleton
  // page flashing behind the modal
  return null;
}
