

## Fix "x კითხვა" Badge Black Rectangle Flash on Scroll

### Problem

When scrolling on the explore page, the "7 კითხვა" question count badge on trivia cards briefly renders as a black rectangle before appearing correctly. This happens because `backdrop-blur-sm` forces the browser to create a separate compositing layer and sample the pixels behind it -- during rapid scrolling with framer-motion entrance animations (opacity + transform), the backdrop-blur layer can't resolve its background in time and flashes black.

### Root Cause

The `backdrop-blur-sm` CSS property on the badge requires the GPU to:
1. Render everything behind the element
2. Apply a blur filter to that content
3. Composite the blurred result under the badge

When combined with framer-motion's `initial={{ opacity: 0, y: 20 }}` entrance animations on each card, the backdrop source isn't ready during the first paint frames, causing the black flash.

### Solution

Replace `backdrop-blur-sm` with a slightly more opaque solid background (`bg-black/60`) on the question count badge. This eliminates the GPU compositing overhead entirely while maintaining the same visual appearance (dark pill with white text over a gradient). The badge is small enough that the blur effect was barely perceptible anyway.

Apply the same fix to the "played" badge in `TriviaPortfolioCard.tsx` which has the same issue with `bg-emerald-500/90 backdrop-blur-sm`.

### Changes

#### 1. `src/components/social/PlayerFeedItem.tsx`
- **Line 289**: Change the question count badge from `bg-black/40 backdrop-blur-sm` to `bg-black/60` (removes blur, increases opacity for readability)

#### 2. `src/components/social/TriviaPortfolioCard.tsx`
- **Line 119**: Change the "played" badge from `bg-emerald-500/90 backdrop-blur-sm` to `bg-emerald-500` (solid background, no blur)
- **Line 133**: Change the question count badge from `bg-black/40 backdrop-blur-sm` to `bg-black/60` (same fix as PlayerFeedItem)

#### 3. `src/components/social/FeedPost.tsx`
- **Lines 332 and 335**: Change `bg-white/20 backdrop-blur-sm` to `bg-white/30` on the question count and answer format badges (same pattern fix)

### Files Changed
- `src/components/social/PlayerFeedItem.tsx` -- remove backdrop-blur from question count badge
- `src/components/social/TriviaPortfolioCard.tsx` -- remove backdrop-blur from played badge and question count badge
- `src/components/social/FeedPost.tsx` -- remove backdrop-blur from stats badges

