

## Fix: Show Invite Friends Modal on Home Page When Plays Are Exhausted

### Root Cause

The home page (`src/pages/Index.tsx`) has its own play-limit handling in `handlePlayClick` (line 307-310) that directly shows `PlayLimitModal` via `setShowGuestMaxPlaysModal(true)`. It **does not** use `guardPlay` from `PlayGuardContext`, so the `InviteFriendsModal` is never triggered.

The same bypass also happens at line 564-567 (category quick-play flow).

### Fix

**File: `src/pages/Index.tsx`**

1. In `handlePlayClick` (line 307-310): When a logged-in user has 0 plays (`!canPlay && !isVip`), show the **InviteFriendsModal first** instead of going straight to PlayLimitModal.
   - Change `setShowGuestMaxPlaysModal(true)` to `setInviteModalVisible(true)` (the invite modal state is already available from `useInviteModalVisibility`)

2. Same change at line 564-567 (category quick-play guard): replace `setShowGuestMaxPlaysModal(true)` with `setInviteModalVisible(true)`

3. Update the `InviteFriendsModal` instance already rendered in Index.tsx to chain into `PlayLimitModal` on dismiss (set `onDismiss` to show the PlayLimitModal after the invite modal is closed)

### Flow After Fix

```text
User has 0 plays -> taps Play button on home
  |
  v
InviteFriendsModal appears instantly
  ("Invite friends, get 10-day PRO!")
  |
  User dismisses
  |
  v
PlayLimitModal appears
  ("Become PRO" or wait for regen)
```

### Technical Details

**Lines to change in `src/pages/Index.tsx`:**

- Line 309: `setShowGuestMaxPlaysModal(true)` --> `setInviteModalVisible(true)` (for logged-in users only; guest flow stays the same)
- Line 566: `setShowGuestMaxPlaysModal(true)` --> `setInviteModalVisible(true)`
- Update the `<InviteFriendsModal>` JSX to add `onDismiss={() => setShowGuestMaxPlaysModal(true)}` so PlayLimitModal follows after dismiss

No new files, no new dependencies -- just wiring the existing invite modal into the existing play-limit flow on the home page.
