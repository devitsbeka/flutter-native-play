
## Swap "შენი ლიგა" Badge with "ნახე რეიტინგი" Button

### Problem
The golden "შენი ლიგა" (Your League) badge looks more like a button than the actual "ნახე რეიტინგი" (View Rating) button at the bottom. Users are confused -- they try to tap "შენი ლიგა" expecting it to do something, but it's non-interactive (`pointer-events-none`), while the real action button at the bottom is less prominent.

### Solution
Replace the "შენი ლიგა" badge with a league-colored "ნახე რეიტინგი" button that opens the ratings. Below it, show a subtle "შენი ლიგა" label when the user is viewing their own league.

### Changes

#### File: `src/pages/Leaderboards.tsx`

**1. Update `AnimatedLeagueBadge` component (line 47-51)**
- Change text from "შენი ლიგა" to "ნახე რეიტინგი"
- Remove `pointer-events-none` -- make it clickable
- Accept an `onClick` prop to trigger ratings view
- Use league-tier-appropriate variant (bronze/default for tier 1, silver-style for tier 2, gold for tier 3)

**2. Mobile collapsed view (lines 264-283)**
- Remove the separate bottom "ნახე რეიტინგი" button (lines 264-276)
- Update the "შენი ლიგა" badge (lines 278-283) to become the new clickable "ნახე რეიტინგი" button that calls `setIsExpanded(true)`
- Show it for ALL tiers (not just when `activeTier === userTier`)
- Add "შენი ლიგა" text label below the button when viewing user's own league, with a text shadow/outline for visibility on the colorful background

**3. Tablet view (lines 480-502)**
- Remove the separate bottom "ნახე რეიტინგი" button (lines 491-502)
- Replace the "შენი ლიგა" badge (lines 480-485) with a clickable "ნახე რეიტინგი" button that calls `setIsModalOpen(true)`
- Show for all tiers
- Add "შენი ლიგა" label below when it's the user's league

**4. Desktop view (lines 643-665)**
- Same treatment as tablet: merge the badge and button into one league-colored "ნახე რეიტინგი" button
- Add "შენი ლიგა" label below when applicable

**5. League-colored button styling**
- Tier 1 (Bronze): Use existing `variant="gold"` or a warm bronze gradient
- Tier 2 (Silver): Use `variant="outline"` with silver/gray gradient styling
- Tier 3 (Gold): Use `variant="gold"` 
- The button variant will be based on `activeTier` (the tier being viewed), not the user's tier

**6. "შენი ლიგა" label visibility**
- White text with dark text-shadow (`text-shadow: 0 1px 4px rgba(0,0,0,0.5)`) to ensure readability on any league background
- Small font size, centered below the button
