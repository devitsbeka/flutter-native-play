
# Fix: Add Friend Button - Show Pending Status Correctly

## Problem Analysis

After thorough investigation, I discovered that the "დამატება" button **IS working correctly** - the click handlers fire, the function executes, and database operations complete. The issue is **user experience and visual feedback**:

### What's Actually Happening:
1. User clicks "დამატება" button
2. `handleSendRequest(userId)` is called (confirmed via console logs)
3. `sendFriendRequest(userId)` runs in `useFriends.ts`
4. The function checks for existing friendship - finds a PENDING request
5. Returns `false` and shows toast "მოთხოვნა უკვე გაგზავნილია"

### The Real Problems:
1. **Pending outgoing requests not filtered**: Users to whom you've already sent a request still appear in search results with an active "დამატება" button
2. **No visual indicator for pending requests**: Users can't see that they've already sent a request to someone
3. **Button appears to do nothing**: When user already sent a request, clicking shows a toast but button stays the same

---

## Solution

### Track Outgoing Pending Requests

Modify `InviteFriendsModal` to fetch and display outgoing pending friendship requests, so:
1. Users with pending outgoing requests show a different button state ("მოლოდინში" / "Pending")
2. The button is disabled for these users
3. Users get clear visual feedback

### Files to Modify

**src/components/team/InviteFriendsModal.tsx**

1. Add state to track pending outgoing requests
2. Fetch pending outgoing requests from the `friendships` table
3. Update button display to show "მოლოდინში" (Pending) for users with existing requests

---

## Technical Implementation

### Step 1: Add Pending Requests State
```typescript
const [pendingOutgoingIds, setPendingOutgoingIds] = useState<Set<string>>(new Set());
```

### Step 2: Fetch Pending Outgoing Requests on Modal Open
```typescript
useEffect(() => {
  const fetchPendingOutgoing = async () => {
    if (!user?.id || !isOpen) return;
    
    const { data } = await supabase
      .from("friendships")
      .select("friend_id")
      .eq("user_id", user.id)
      .eq("status", "pending");
    
    if (data) {
      setPendingOutgoingIds(new Set(data.map(f => f.friend_id)));
    }
  };
  
  fetchPendingOutgoing();
}, [user?.id, isOpen]);
```

### Step 3: Update Button Logic
```typescript
const isPendingOutgoing = pendingOutgoingIds.has(result.user_id);

<motion.button
  disabled={sentRequests.has(result.user_id) || isPendingOutgoing || invitingUser === result.user_id || sendingRequestTo === result.user_id}
  // ...
>
  {isPendingOutgoing ? (
    <>
      <Clock className="w-4 h-4" />
      მოლოდინში
    </>
  ) : (invitingUser === result.user_id || sendingRequestTo === result.user_id) ? (
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

### Step 4: Update sentRequests After Successful Send
When a request is successfully sent, also add to `pendingOutgoingIds`:
```typescript
if (success) {
  setSentRequests(prev => new Set([...prev, userId]));
  setPendingOutgoingIds(prev => new Set([...prev, userId]));
}
```

---

## Summary

| Issue | Fix |
|-------|-----|
| Button "does nothing" | Actually working, but shows toast that may be missed |
| No pending status indicator | Add "მოლოდინში" button state with Clock icon |
| Can click on users with pending requests | Disable button for pending outgoing requests |
| No visual distinction | Different button styling for pending state |

This fix ensures users get clear feedback about friend request status at all times.
