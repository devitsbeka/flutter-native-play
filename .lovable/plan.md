
# Fix Guest Home Screen Layout for Small Viewports

## Problems
1. On small mobile screens, the large avatar (280px) pushes the username and auth buttons below the fold, where they get covered by the bottom navigation bar
2. The default guest name shows "Trivia King" instead of "Guest"

## Changes

### File: `src/pages/Index.tsx`

**1. Rename "Trivia King" to "Guest"**
- Line 557 (desktop guest): Change `Trivia King` to `Guest`
- Line 613 (mobile guest): Change `Trivia King` to `Guest`

**2. Fix mobile guest layout to fit small viewports**
- Reduce avatar size from `280` to `220` on mobile (line 598)
- Reduce the top margin offset: change `marginTop: -5` to `marginTop: -30` to shift the whole block upward (line 584)
- Reduce spacing between avatar and name: change `mt-8` to `mt-3` (line 610)
- Reduce spacing between name and buttons: change `mt-4` to `mt-3` (line 616)
- Reduce font size of "Guest" text from `32` to `26` (line 612)

These adjustments will ensure the avatar, username, and auth buttons all remain visible above the bottom navigation on screens as small as 320px wide / ~568px tall.
