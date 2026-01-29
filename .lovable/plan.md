
# Close Modal After Room Invite

## Problem

When clicking "მოწვევა" (invite) to invite a friend to a room, the modal stays open showing "გაგზავნილი" (sent). The user expects the modal to close automatically so they can see the lobby with the newly invited player.

---

## Solution

Add an optional `onInviteSuccess` callback prop and call it (along with closing the modal) after a successful room invitation.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/InviteFriendsModal.tsx` | Add `onInviteSuccess` prop; auto-close modal after successful invite |
| `src/components/team/RoomLobbyV2.tsx` | (Optional) Pass `onInviteSuccess` for any additional handling |

---

## Implementation Details

### File: `src/components/team/InviteFriendsModal.tsx`

#### 1. Update Props Interface (line 25-34)

Add `onInviteSuccess` callback:

```typescript
interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteLink?: string;
  roomId?: string;
  roomCode?: string;
  onFriendSelect?: (friendId: string) => void;
  selectedFriends?: Set<string>;
  onInviteSuccess?: () => void;  // NEW
}
```

#### 2. Update Component Signature (line 102)

Destructure the new prop:

```typescript
export function InviteFriendsModal({ 
  isOpen, 
  onClose, 
  inviteLink, 
  roomId, 
  roomCode, 
  onFriendSelect, 
  selectedFriends,
  onInviteSuccess  // NEW
}: InviteFriendsModalProps)
```

#### 3. Update `handleInviteToRoom` (lines 202-259)

After successful invitation, show brief success feedback then close:

```typescript
const handleInviteToRoom = async (userId: string) => {
  if (!roomId) return;
  
  setInvitingUser(userId);
  try {
    // ... existing invite logic ...
    
    setSentRequests(prev => new Set([...prev, userId]));
    toast.success("მოწვევა გაიგზავნა!");
    
    // NEW: Close modal after brief delay for feedback
    setTimeout(() => {
      handleClose();
      onInviteSuccess?.();
    }, 600);
    
  } catch (error) {
    console.error("Invite error:", error);
    toast.error("მოწვევა ვერ მოხერხდა");
  } finally {
    setInvitingUser(null);
  }
};
```

---

## User Flow After Fix

1. User is in room lobby (e.g., "ტიტანთა კლუბი")
2. Clicks "+" to invite friends → InviteFriendsModal opens
3. Searches for "TriviaMaste" 
4. Taps "მოწვევა" → Button shows loading spinner
5. On success:
   - Button shows "✓ გაგზავნილი" briefly
   - Toast: "მოწვევა გაიგზავნა!"
   - Modal auto-closes after 600ms
6. User sees room lobby with the invited player visible in participants list (showing "invited" status)

---

## Visual Feedback Timeline

```text
0ms    - User taps "მოწვევა"
0-300ms - Button shows Loader2 spinner
300ms  - Invitation completes
300ms  - Button shows "✓ გაგზავნილი"
300ms  - Toast appears: "მოწვევა გაიგზავნა!"
900ms  - Modal closes automatically
900ms  - User sees lobby with invited player
```

This provides clear visual confirmation that the invite was sent while keeping the UX fluid.
