

## Show Invite Friends Modal Only When Free Plays Are Exhausted

### Current Behavior
The invite modal shows for **every** logged-in non-VIP user after 3 seconds, regardless of how many plays they have left.

### Desired Behavior
Only show the modal when the user has **0 free plays remaining** (all 5 games played).

### Changes

**File: `src/components/home/InviteFriendsModal.tsx`**

Update the `useInviteModalVisibility` hook to accept play limit data and gate visibility:

1. Add a new parameter `freeGamesExhausted: boolean` (from `usePlayLimit`)
2. Only trigger the 3-second timer when `freeGamesExhausted` is true
3. Keep existing guards: must be logged in, not VIP, not already dismissed this session

**File: `src/pages/Index.tsx`**

Update the call site to pass the exhaustion flag:

1. The page already uses `usePlayLimit()` -- pass `freeGamesExhausted` to `useInviteModalVisibility`
2. Change from: `useInviteModalVisibility(isVip, vipLoading)`
3. Change to: `useInviteModalVisibility(isVip, vipLoading, freeGamesExhausted)`

### Technical Detail

Updated hook signature:
```
useInviteModalVisibility(isVip, vipLoading, freeGamesExhausted)
```

Updated condition inside the hook:
```
if (!user || vipLoading || isVip || !freeGamesExhausted) return;
```

This is a minimal 2-file change -- just adding one boolean guard to the existing visibility logic.

