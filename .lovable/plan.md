

# Fix: Add Friend Button Not Working

## Problem Identified

After analyzing the codebase, I found the root cause of the "დამატება" (Add Friend) button not working properly:

### Issue 1: Missing Loading State for Friend Requests

The `InviteFriendsModal` component has a loading state (`invitingUser`) that only works for **room invitations**, not for **friend requests**:

```typescript
// Current code - only handles room invites
const [invitingUser, setInvitingUser] = useState<string | null>(null);

// handleInviteToRoom sets loading state
setInvitingUser(userId); // SET
// ... do work ...
setInvitingUser(null);   // CLEAR

// handleSendRequest does NOT set loading state!
const handleSendRequest = async (userId: string) => {
  const success = await sendFriendRequest(userId);
  // No loading indicator!
  if (success) {
    setSentRequests(prev => new Set([...prev, userId]));
  }
};
```

### Issue 2: Button Disabled Logic Incomplete

The button's `disabled` condition only checks for room invites:

```typescript
disabled={sentRequests.has(result.user_id) || invitingUser === result.user_id}
// invitingUser is ONLY set for room invites, never for friend requests!
```

This means:
- When you click "დამატება", the button is never disabled during the request
- No loading spinner appears
- The user can click multiple times, potentially causing duplicate requests
- If the request fails silently, there's no feedback

### Issue 3: Button Missing `type="button"` Attribute

Although less likely the cause, `motion.button` elements should have `type="button"` to prevent any potential form submission behavior.

---

## Solution

### Step 1: Add Separate Loading State for Friend Requests

Create a new state variable to track which user we're sending a friend request to:

```typescript
const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
```

### Step 2: Update `handleSendRequest` with Loading State

```typescript
const handleSendRequest = async (userId: string) => {
  setSendingRequestTo(userId);  // Start loading
  try {
    const success = await sendFriendRequest(userId);
    if (success) {
      setSentRequests(prev => new Set([...prev, userId]));
    }
  } finally {
    setSendingRequestTo(null);  // End loading
  }
};
```

### Step 3: Update Button Disabled and Loading Logic

```typescript
<motion.button
  type="button"
  onClick={() => isRoomInviteMode 
    ? handleInviteToRoom(result.user_id) 
    : handleSendRequest(result.user_id)
  }
  disabled={
    sentRequests.has(result.user_id) || 
    invitingUser === result.user_id ||
    sendingRequestTo === result.user_id  // ADD THIS
  }
  ...
>
  {(invitingUser === result.user_id || sendingRequestTo === result.user_id) ? (
    <Loader2 className="w-4 h-4 animate-spin" />
  ) : sentRequests.has(result.user_id) ? (
    <>
      <Check className="w-3 h-3" />
      გაგზავნილი
    </>
  ) : (
    <>
      <UserPlus className="w-4 h-4" />
      {isRoomInviteMode ? "მოწვევა" : "დამატება"}
    </>
  )}
</motion.button>
```

### Step 4: Reset State on Modal Close

```typescript
const handleClose = () => {
  setSearchQuery("");
  setSearchResults([]);
  setSentRequests(new Set());
  setSendingRequestTo(null);  // ADD THIS
  onClose();
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/InviteFriendsModal.tsx` | Add `sendingRequestTo` state, update `handleSendRequest` with loading, update button disabled/loading logic, add `type="button"` |

---

## Technical Details

### Before (Broken)
```text
User clicks "დამატება"
  → handleSendRequest(userId) called
  → No visual feedback
  → sendFriendRequest runs in background
  → User thinks nothing happened
  → Possibly clicks again (duplicate)
```

### After (Fixed)
```text
User clicks "დამატება"
  → setSendingRequestTo(userId)
  → Button shows spinner, becomes disabled
  → sendFriendRequest runs
  → On success: shows "გაგზავნილი" with checkmark
  → On failure: toast error message
  → setSendingRequestTo(null)
```

