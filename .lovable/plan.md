

## Show Invite Friends Gift Modal When Plays Are Exhausted

### Problem
When a user has 0 free plays and clicks "Play Again" after a game, they see the generic `PlayLimitModal` (PRO upgrade prompt). The new invite friends modal ("მოიწვიე მეგობრები") never appears in this flow. On the home page, the invite modal only fires once with a 3-second delay and is blocked if already dismissed in the current session.

### Solution
Show the **InviteFriendsModal** instead of (or before) the PlayLimitModal when the user has exhausted their free plays. This applies to:

1. **MatchResultScreen** (PVP game results -- "კიდევ ითამაშე" button)
2. **Index page** (home screen -- remove the 3s delay, show instantly)
3. **PlayGuardContext** (central guard used by the play button on home)

### Changes

**File: `src/components/game/MatchResultScreen.tsx`**
- Import `InviteFriendsModal` from `@/components/home/InviteFriendsModal`
- Add state `showInviteModal` (boolean)
- In `handlePlayAgain`: when plays are exhausted (`gamesPlayedAfterThisGame >= MAX_FREE_PLAYS`), show the InviteFriendsModal **first** instead of PlayLimitModal
- Add `<InviteFriendsModal>` component to the JSX
- On dismiss of InviteFriendsModal, then show PlayLimitModal (so user still sees the PRO upgrade option after)

**File: `src/components/home/InviteFriendsModal.tsx`**
- Remove the 3-second `setTimeout` delay -- show the modal instantly when conditions are met
- This ensures it appears immediately when the user lands on the home page with 0 plays

**File: `src/contexts/PlayGuardContext.tsx`**
- Import `InviteFriendsModal`
- Add state for showing the invite modal
- In `guardPlay`: when user can't play, show InviteFriendsModal first, then PlayLimitModal on dismiss
- This covers the main play button on the home screen

### Flow After Changes

```text
User has 0 plays -> clicks Play
  |
  v
InviteFriendsModal appears instantly
  ("Invite friends, get 10-day PRO!")
  |
  User dismisses or shares link
  |
  v
PlayLimitModal appears
  ("Become PRO" or wait for regen)
```

### Technical Details

**MatchResultScreen changes:**
- New state: `const [showInviteModal, setShowInviteModal] = useState(false)`
- In `handlePlayAgain` at line 286-288: change to `setShowInviteModal(true)` instead of `setShowPlayLimitModal(true)`
- Add onDismiss handler: when invite modal closes, show PlayLimitModal
- Add `<InviteFriendsModal open={showInviteModal} onOpenChange={setShowInviteModal} onDismiss={() => setShowPlayLimitModal(true)} />`

**InviteFriendsModal hook change:**
- Line 23: Change `setTimeout(() => setVisible(true), 3000)` to `setVisible(true)` (no delay)

**PlayGuardContext changes:**
- Add `showInviteModal` state
- In `guardPlay` callback: when `!canPlay`, set `showInviteModal = true` instead of `showModal`
- On invite modal dismiss: set `showModal = true` (PlayLimitModal)
- Add InviteFriendsModal to JSX output
