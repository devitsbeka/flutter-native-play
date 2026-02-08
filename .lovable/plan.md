
## Fix: PRO Users Should Never See Sand Timer on Play Button

### Problem
The "not played" state of the play button in feed cards always shows an Hourglass icon and opens the PlayLimitModal, regardless of whether the user is PRO/VIP. PRO users should see a normal Play icon and navigate directly to the trivia without any limit gating.

### Root Cause
Both `PlayerFeedItem.tsx` and `TriviaPortfolioCard.tsx` have the same logic:
- If `isPlayed` is true: show compact purple circle with Play icon, navigate directly
- If `isPlayed` is false: **always** show Hourglass icon and open PlayLimitModal

The `usePlayLimit` hook already provides `isVip`, but neither component uses it for the button rendering or click behavior.

### Changes

**File 1: `src/components/social/PlayerFeedItem.tsx`**
1. Destructure `isVip` from the existing `usePlayLimit()` call
2. Update `handlePlayClick`: if PRO user and not played, navigate directly instead of showing PlayLimitModal
3. Update the "not played" button icon: show Play icon (with text) for PRO users, Hourglass only for free users

**File 2: `src/components/social/TriviaPortfolioCard.tsx`**
1. Destructure `isVip` from the existing `usePlayLimit()` call
2. Update `handlePlayClick`: if PRO user and not played, navigate directly instead of showing PlayLimitModal
3. Update the "not played" button icon: show Play icon (with text) for PRO users, Hourglass only for free users

### Updated Logic (same pattern in both files)

handlePlayClick:
```text
if (isPlayed) -> navigate directly (unchanged)
else if (isVip) -> navigate directly (NEW - skip modal)
else -> show PlayLimitModal (unchanged)
```

Button icon (not-played state):
```text
if (isVip) -> Play icon + "ითამაშე" text
else -> Hourglass icon + "ითამაშე" text (unchanged)
```

### Technical Detail
- `usePlayLimit()` already returns `isVip` -- just needs destructuring
- No new imports needed (Play icon is already imported in both files)
- PlayLimitModal stays in the JSX but will never open for PRO users
