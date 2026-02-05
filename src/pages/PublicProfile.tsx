import { useEffect } from "react";
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

  // Open the profile modal when the page loads
  useEffect(() => {
    if (userId && userId !== currentProfileUserId) {
      openProfile(userId);
    }
  }, [userId, openProfile, currentProfileUserId]);

  // When modal is closed, navigate back
  useEffect(() => {
    // Only navigate back if we previously had a profile open and now it's closed
    if (!currentProfileUserId && userId) {
      // Small delay to allow modal close animation
      const timer = setTimeout(() => {
        navigate(-1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentProfileUserId, userId, navigate]);

  // Show loading skeleton while modal opens
  return <PageSkeleton />;
}
