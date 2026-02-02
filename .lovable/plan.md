
# Add Loading Indicators for Interactive Action Buttons

## Overview
Add consistent loading/sending indicators to buttons that currently lack proper visual feedback after being clicked. The goal is to standardize the user experience across all interactive elements with the pattern already established in the Add Friend button.

## Current State Analysis

| Component | Action | Current State | Needs Fix |
|-----------|--------|---------------|-----------|
| `InviteFriendsModal` | Add Friend (`+ დამატება`) | Spinner + "იგზავნება..." text | No - already good |
| `InviteFriendsModal` | Invite (`მოწვევა`) | Spinner only, no text | **Yes** |
| `CompactNotificationCard` | Accept/Decline | Shows "..." only | **Yes** |
| `PlayerProfileModal` | Add Friend (`დამატება`) | Disabled only, no visual | **Yes** |
| `PlayerProfileModal` | Challenge (`გამოწვევა`) | Navigates instantly | No - navigation is instant |

## Technical Changes

### 1. InviteFriendsModal.tsx - Invite Button (Lines ~477-500)

**Current behavior:** When inviting a friend to a room, the button shows only a `Loader2` spinner.

**Fix:** Add "იგზავნება..." text next to the spinner for consistency with Add Friend button.

```tsx
// Before (around line 477-493)
{isLoading ? (
  <Loader2 className="w-4 h-4 animate-spin" />
) : ...

// After
{isLoading ? (
  <>
    <Loader2 className="w-4 h-4 animate-spin" />
    იგზავნება...
  </>
) : ...
```

### 2. CompactNotificationCard.tsx - Accept/Decline Buttons (Lines 399-413)

**Current behavior:** Shows "..." when loading.

**Fix:** Show a more descriptive loading state with spinner.

```tsx
// Before (line 402)
{isLoading ? "..." : isFriendRequest ? "მიღება" : "შესვლა"}

// After - Accept button
{isLoading ? (
  <span className="flex items-center gap-1">
    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
  </span>
) : isFriendRequest ? "მიღება" : "შესვლა"}

// Similar for Decline button
```

### 3. PlayerProfileModal.tsx - Add Friend Button (Lines 308-318)

**Current behavior:** Button only gets disabled when `addingFriend` is true.

**Fix:** Add loading spinner and text feedback.

```tsx
// Before
<ChunkyButton
  onClick={handleAddFriend}
  disabled={addingFriend}
  variant="secondary"
  size="sm"
  className="flex-1"
>
  <UserPlus className="w-4 h-4 mr-1" />
  დამატება
</ChunkyButton>

// After
<ChunkyButton
  onClick={handleAddFriend}
  disabled={addingFriend}
  variant="secondary"
  size="sm"
  className="flex-1"
>
  {addingFriend ? (
    <>
      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      იგზავნება...
    </>
  ) : (
    <>
      <UserPlus className="w-4 h-4 mr-1" />
      დამატება
    </>
  )}
</ChunkyButton>
```

Also need to import `Loader2` from lucide-react in this file.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/InviteFriendsModal.tsx` | Add "იგზავნება..." text to invite button loading state |
| `src/components/notifications/CompactNotificationCard.tsx` | Add spinner to accept/decline loading states |
| `src/components/profile/PlayerProfileModal.tsx` | Add loading state with spinner + text to Add Friend button |

---

## Visual Consistency

All action buttons will now follow the same pattern:
1. **Default state**: Icon + text label
2. **Loading state**: Spinning loader + "იგზავნება..." text (or just spinner for compact buttons)
3. **Success state**: Check icon + confirmation text (where applicable)
4. **Pending state**: Clock icon + "მოლოდინში" text (for friend requests)

