import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { PageSkeleton } from "@/components/PageSkeleton";

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

  // Open the profile modal when the page loads
  useEffect(() => {
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

  // Show loading skeleton while modal opens
  return <PageSkeleton />;
}
