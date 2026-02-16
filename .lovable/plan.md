

## First-Time Icon Tooltip on Edit Screens

### What It Does
When a user opens the trivia/collection/party creation or edit screen for the **first time**, a beautiful animated tooltip will appear pointing at the icon button, telling them they can customize each question's icon. It auto-dismisses after 4 seconds or on any tap.

### Implementation

**New Component: `src/components/shared/IconOnboardingTooltip.tsx`**

A reusable tooltip component that:
- Uses `localStorage` key `"icon_onboarding_tooltip_shown"` to show only once ever
- Renders a floating animated tooltip (framer-motion spring animation) with an arrow pointing at the icon area
- Georgian text: "დაამატე აიკონი კითხვას!" (Add an icon to the question!)
- Auto-dismisses after 4 seconds or on any touch/click
- Styled similarly to the existing `TabOnboardingTooltips` pattern (white card, shadow, arrow)

**File: `src/components/team/GameStylePersonalTrivia.tsx`**

- Import and render `IconOnboardingTooltip` inside the first question card, positioned below the icon button (around line 1047)
- Only show on the first question (index === 0) and when the icon is empty (`!question.iconSlug`)

**File: `src/components/social/EditQuizModal.tsx`**

- Import and render the same `IconOnboardingTooltip` in the questions view, positioned below the icon button (around line 516)
- Same conditions: first question, no icon set

### Technical Details

The tooltip component:
```
- localStorage key: "icon_onboarding_tooltip_shown"
- Appears with a 800ms delay after mount
- Auto-dismiss: 4 seconds
- Dismiss on any touch/click
- Animated: spring scale + fade in, positioned below the icon with an upward-pointing arrow
- Text: "დაამატე აიკონი კითხვას! 🎨" with a small ImageIcon
- Once dismissed, sets localStorage and never shows again across any creation flow
```

3 files total: 1 new component + 2 existing files edited.
