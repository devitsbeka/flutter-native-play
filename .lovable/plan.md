
# Guest Home Screen Redesign

## Overview

Redesign the mobile guest view on the home screen to replace the "სტუმარი" username and coin/gem displays with authentication actions:

1. Move the mascot avatar higher (reduce top margin)
2. Remove "სტუმარი" text
3. Add a "შესვლა" (Sign In) button below the mascot
4. Replace coin/gem row with Google and Apple sign-in buttons

## Changes

### File: `src/pages/Index.tsx` (lines 553-620)

**Mascot position** -- Change `marginTop: -5` to a more negative value (e.g., `-30`) to push the mascot higher on screen.

**Remove "სტუმარი" text** -- Delete the `<span>` with "სტუმარი" (lines 596-598).

**Replace coin/gem row with auth buttons** -- Remove the coin icon + "0" and gem icon + "0" display (lines 599-612). Replace with:

1. A "შესვლა" button styled as a primary rounded pill (navigates to `/auth`)
2. Google sign-in button (white, rounded, with Google SVG icon) calling `handleGuestGoogleSignIn`
3. Apple sign-in button (white, rounded, with Apple SVG icon) calling `handleGuestAppleSignIn`

The Google and Apple buttons will reuse the same SVG icons and OAuth handlers already defined in Index.tsx (`handleGuestGoogleSignIn` at line 303, `handleGuestAppleSignIn` at line 314).

**Keep "ან ითამაშე როგორც სტუმარმა"** text and arrow below the auth buttons.

## Technical Details

The guest info section (lines 589-619) will be restructured as:

```text
[AvatarCircle mascot - moved up]
        |
  [შესვლა button]     <-- primary pill, navigates to /auth
        |
  [Google] [Apple]     <-- side by side OAuth buttons
        |
  "ან ითამაშე როგორც სტუმარმა"
        arrow
```

### Specific changes in `src/pages/Index.tsx`:

1. **Line 556**: Change `marginTop: -5` to `marginTop: -30` to move mascot up
2. **Lines 590-618**: Replace the entire guest info `motion.div` content:
   - Remove "სტუმარი" span
   - Remove coin/gem display divs
   - Add "შესვლა" button: `onClick={() => navigate("/auth")}`, styled as `bg-primary text-primary-foreground rounded-full px-10 py-3 font-bold text-lg`
   - Add a row with Google and Apple buttons side by side using the same white rounded style from Auth.tsx but as icon-only square buttons (w-14 h-14 rounded-2xl)
   - Keep the "ან ითამაშე როგორც სტუმარმა" + `HandDrawnArrow` below
