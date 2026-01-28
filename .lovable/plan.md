
# Plan: Fix "მოწვევა" Button to Open Friends Modal

## Problem Summary

On the room creation screen ("ახალი ოთახი"), clicking the "მოწვევა" (Invite) button with the dashed circle opens the native share dialog instead of showing a friends picker modal. Users expect to:
1. Click "მოწვევა" → See their friends list
2. Select friends to invite
3. Friends receive a notification with the inviter's info
4. One-click join from the notification

## Root Cause

The "მოწვევა" button (line 866) calls `handleShareInviteLink` which opens native share functionality. It should open the friends modal for selection instead.

```text
Current Flow:
┌─────────────┐       ┌─────────────────┐
│ მოწვევა btn │──────►│ Native Share    │
└─────────────┘       │ (generic link)  │
                      └─────────────────┘

Expected Flow:
┌─────────────┐       ┌─────────────────┐       ┌────────────────┐
│ მოწვევა btn │──────►│ Friends Modal   │──────►│ Select friends │
└─────────────┘       │ (InviteFriends) │       │ for invitation │
                      └─────────────────┘       └────────────────┘
```

## Solution

### Change 1: Update "მოწვევა" Button Click Handler

**File:** `src/components/team/CreateRoomPage.tsx`

Change the dashed "მოწვევა" button at line 866 to open `setShowInviteModal(true)` instead of `handleShareInviteLink`:

**Before (line 866):**
```tsx
<motion.button
  onClick={handleShareInviteLink}
  className="shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 min-w-[68px]"
```

**After:**
```tsx
<motion.button
  onClick={() => setShowInviteModal(true)}
  className="shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 min-w-[68px]"
```

### Change 2: Create Pre-Room Friends Selection Modal

The current `InviteFriendsModal` is designed for inviting to an **existing room**. For the room creation screen (where no room exists yet), we need to use it in a "selection mode" that returns selected friends rather than immediately sending invitations.

**Modify the `InviteFriendsModal` render call (around line 1380):**

Pass a callback to handle friend selection for the pre-room flow:

```tsx
<InviteFriendsModal
  isOpen={showInviteModal}
  onClose={() => setShowInviteModal(false)}
  // Pre-room mode: no roomId, use selection callback
  onFriendSelect={(friendId: string) => {
    const newSelected = new Set(selectedFriends);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriends(newSelected);
  }}
  selectedFriends={selectedFriends}
/>
```

### Change 3: Update InviteFriendsModal for Dual Mode

**File:** `src/components/team/InviteFriendsModal.tsx`

Add new props for pre-room selection mode:

```tsx
interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteLink?: string;
  roomId?: string;
  roomCode?: string;
  // NEW: Pre-room selection mode
  onFriendSelect?: (friendId: string) => void;
  selectedFriends?: Set<string>;
}
```

Update the friend action button to handle both modes:
- **With roomId:** Send invitation immediately (existing behavior)
- **Without roomId but with onFriendSelect:** Toggle selection in parent state

### Change 4: Add Friends List Section to Modal

Currently the modal only shows search results. Add a section to display the user's existing friends (from `useFriends` hook) so they can be selected directly without searching.

**Add friends list section before search results:**

```tsx
{/* Existing Friends Section */}
{friends.filter(f => f.status === 'accepted').length > 0 && !searchQuery && (
  <div className={`space-y-2 ${narrow}`}>
    <p className="text-sm font-medium text-white/80 px-1">შენი მეგობრები</p>
    <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
      {friends.filter(f => f.status === 'accepted').map((friend) => {
        const isSelected = selectedFriends?.has(friend.friendId) || false;
        return (
          <button
            key={friend.friendId}
            onClick={() => onFriendSelect?.(friend.friendId)}
            className={`flex flex-col items-center p-2 rounded-xl ${
              isSelected ? 'bg-primary/30 ring-2 ring-white' : 'bg-white/10'
            }`}
          >
            <SafeAvatar ... />
            <span className="text-xs text-white truncate">{friend.nickname}</span>
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        );
      })}
    </div>
  </div>
)}
```

---

## Notification Flow (Already Works)

When the room is created with selected friends, the existing code at lines 679-718 in `CreateRoomPage.tsx` already:

1. Adds friends as `status: 'invited'` participants
2. Calls `sendInvitation()` which creates notification with:
   - `type: 'room_invite'`
   - Sender's nickname and avatar (from profile)
   - Room ID and room code
3. The notification includes sender info for display

The `CompactNotificationCard` already shows:
- Sender avatar
- "გიწვევს თამაშში" (invites you to play)
- Green "ითამაშე" (Play) button
- One-click navigation to `/team?join={room_code}`

---

## Technical Changes Summary

| File | Change |
|------|--------|
| `src/components/team/CreateRoomPage.tsx` (line 866) | Change "მოწვევა" onClick from `handleShareInviteLink` to `setShowInviteModal(true)` |
| `src/components/team/CreateRoomPage.tsx` (line ~1380) | Pass selection props to `InviteFriendsModal` |
| `src/components/team/InviteFriendsModal.tsx` | Add `onFriendSelect` and `selectedFriends` props |
| `src/components/team/InviteFriendsModal.tsx` | Add friends grid when not searching |
| `src/components/team/InviteFriendsModal.tsx` | Update button logic for dual mode (select vs invite) |

---

## Testing Checklist

1. Open "ახალი ოთახი" (New Room) screen
2. Click "მოწვევა" button (dashed circle)
3. Verify friends modal opens with list of friends
4. Select multiple friends → They should show checkmarks
5. Close modal → Selected friends should appear in the horizontal row with checkmarks
6. Create room → Friends receive notifications
7. Friend clicks "ითამაშე" on notification → Joins room directly
