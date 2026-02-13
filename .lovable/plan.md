

## Remove Black Overlay on Profile Page

### Problem
The profile page has a dark gradient overlay (`from-black/30 via-black/20 to-black/50`) on line 76 of `src/pages/Profile.tsx`. While the background video is loading, this creates the ugly black appearance you see in the screenshot.

### Solution
Replace the black gradient overlay with a much softer, lighter alternative that won't look jarring during the video load delay. Also add a light fallback background color to the video container so the page looks clean even before the video loads.

### Technical Details

**File: `src/pages/Profile.tsx`**

1. **Line 70**: Change the video container background from no color to a light fallback (e.g., `bg-purple-100`) so during load, users see a soft color instead of black
2. **Line 76**: Replace `bg-gradient-to-b from-black/30 via-black/20 to-black/50` with a much lighter overlay like `bg-gradient-to-b from-white/10 via-transparent to-white/20` to maintain readability without the dark look

### Files to Edit
- `src/pages/Profile.tsx` -- 2 small changes on lines 70 and 76

