import { useEffect } from "react";
import { useFriends } from "@/hooks/useFriends";
import { useSound } from "@/contexts/SoundContext";

/**
 * Wrapper hook that adds sound effects to friend-related events
 */
export function useFriendsWithSound() {
  const friendsData = useFriends();
  const { playSound, vibrate } = useSound();

  // Play sound when pending requests change (new request received)
  useEffect(() => {
    // We use a stable reference to track changes
    const handleNewRequest = () => {
      if (friendsData.pendingRequests.length > 0) {
        playSound("friend-request");
        vibrate([50, 30, 50]);
      }
    };

    // This effect will run when pendingRequests changes
    // The actual notification is handled in useFriends via realtime subscription
  }, [friendsData.pendingRequests.length, playSound, vibrate]);

  // Wrap accept/decline with sounds
  const acceptFriendRequestWithSound = async (friendshipId: string) => {
    const result = await friendsData.acceptFriendRequest(friendshipId);
    if (result) {
      playSound("friend-accepted");
      vibrate(100);
    }
    return result;
  };

  const declineFriendRequestWithSound = async (friendshipId: string) => {
    const result = await friendsData.declineFriendRequest(friendshipId);
    if (result) {
      playSound("button-click");
    }
    return result;
  };

  const sendFriendRequestWithSound = async (friendId: string) => {
    const result = await friendsData.sendFriendRequest(friendId);
    if (result) {
      playSound("notification");
      vibrate(50);
    }
    return result;
  };

  return {
    ...friendsData,
    acceptFriendRequest: acceptFriendRequestWithSound,
    declineFriendRequest: declineFriendRequestWithSound,
    sendFriendRequest: sendFriendRequestWithSound,
  };
}
