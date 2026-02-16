

## Fix: Gift Modals Showing Too Early

### Problem

Both gift modals (BetaGiftModal and ProGiftModal) appear for any signed-in non-VIP user regardless of how many free games they've played. The user wants them to only appear **after all 5 free games are exhausted**, as a conversion incentive.

### Changes

**File: `src/components/shared/BetaGiftModal.tsx` -- `useReturnGiftEligibility`**

- Change the games_played check from `>= 1` to `>= 5` (the MAX_FREE_PLAYS constant)
- This ensures the "welcome back" gift only shows after the user has used all free plays

Current (line 82):
```typescript
if (profile && (profile.games_played ?? 0) >= 1) {
```

New:
```typescript
if (profile && (profile.games_played ?? 0) >= 5) {
```

**File: `src/components/home/ProGiftBanner.tsx` -- `useProGiftEligibility`**

- Add a check for `games_played >= 5` before marking as eligible
- Fetch the user's profile to check games_played count
- Only set eligible to true if user has exhausted free plays

Current logic (line 26):
```typescript
const eligible = !!user && !isExpired && !alreadyClaimed && !isVip && !loading;
```

New logic: add an async check (similar to BetaGiftModal) that queries `profiles.games_played` and only returns eligible when `games_played >= 5`.

### Result

- Users who still have free games left will never see these gift modals
- Once a user plays all 5 free games, the gift modals become available as a conversion tool ("you're out of plays, here's free PRO!")
- Clicking "გამოსვლა" (logout) from settings won't trigger any gift modal for users with remaining free plays
