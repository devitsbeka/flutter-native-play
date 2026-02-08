
## Fix Save/Like Count + Increase Stats Visibility on Explore Feed Cards

### Problem 1: Save/Like Counts Show 0 After Click

When you click the save or like button on the explore feed, the count doesn't update because the mutation in `useSocialFeed.ts` only invalidates `quiz-posts-with-profiles` and `my-quiz-posts` query keys. The explore feed uses different queries (`player-feed-items` and `explore-creators`) which are never refreshed after a save/like action.

### Problem 2: Stats Too Small

The like, save, and play icons and counts are currently at a base size (20px icons, 14px text) which is hard to tap on mobile and hard to read on desktop.

### Solution

#### 1. Fix Count Refresh (useSocialFeed.ts)

Add `player-feed-items` and `explore-creators` to the invalidation lists in both `likeMutation.onSettled` and `saveMutation.onSettled`. This ensures the explore feed re-fetches fresh data (including updated `likes_count` and `saves_count`) after a like or save action.

#### 2. Increase Icons, Counts, and Gaps (PlayerFeedItem.tsx + TriviaPortfolioCard.tsx)

Apply a 15% scale increase to the stats section in both mobile and desktop card components:

- Icons: `w-5 h-5` (20px) becomes custom `w-[26px] h-[26px]` (26px -- approximately 15% larger for better visibility)
- Count text: `text-sm` (14px) becomes custom `text-[17px]` (17px)
- Gap between icon and count: `gap-1.5` (6px) stays at `gap-1.5` for tightness
- Gap between stat groups (like vs save): `gap-3` (12px) becomes `gap-6` (24px) for more finger-friendly spacing

### Technical Details

**File: `src/hooks/useSocialFeed.ts`**

In `likeMutation.onSettled` (around line 186-190): Add invalidation of `player-feed-items` and `explore-creators` query keys.

In `saveMutation.onSettled` (around line 243-248): Add invalidation of `player-feed-items` and `explore-creators` query keys.

**File: `src/components/social/PlayerFeedItem.tsx`**

Update the stats section (lines 299-324):
- Stats container gap: `gap-3` to `gap-6`
- Icon images: `w-5 h-5` to `w-[26px] h-[26px]`
- Count text: `text-sm` to `text-[17px]`

**File: `src/components/social/TriviaPortfolioCard.tsx`**

Update the stats section (lines 142-168):
- Stats container gap: `gap-[14px]` to `gap-6`
- Icon images: `w-5 h-5` to `w-[26px] h-[26px]`
- Count text: `text-sm` to `text-[17px]`

### Files Changed
- `src/hooks/useSocialFeed.ts` -- add query invalidation for explore feed queries
- `src/components/social/PlayerFeedItem.tsx` -- increase icon/text/gap sizes
- `src/components/social/TriviaPortfolioCard.tsx` -- increase icon/text/gap sizes
