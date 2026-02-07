

## Move Up Elements to Free Space for Players Container

The host's results screen has too much vertical space consumed by the celebration elements (trophy, text, badges, category), leaving the scorecard cropped -- the second player is barely visible or cut off entirely.

### Changes to `src/components/team/GameResultsScreenV2.tsx`

**1. Reduce trophy icon size**
- From `w-20 h-20` to `w-16 h-16`
- Reduce bottom margin from `mb-4` to `mb-2`

**2. Reduce the top padding of the celebration section**
- From `pt-4` to `pt-2`

**3. Shrink the large gap between badges and scorecard**
- Reduce the inline `paddingTop: '40px'` on the middle section to `20px`

**4. Reduce back button header top padding**
- From `pt-4` to `pt-3`

**5. Tighten stars margin**
- Stars: keep `mt-2` (already tight)

**6. Reduce Points/Coins row top margin**  
- From `mt-3` to `mt-2`

### Net effect
These changes combined save approximately 40-50px of vertical space, allowing the scorecard to show at least 2 players comfortably without scrolling on mobile viewports. No functional changes -- only spacing adjustments.

