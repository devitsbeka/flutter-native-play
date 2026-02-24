

## Show Icon Preview on Question Card in Studio

### What We're Doing
Adding the question's assigned icon above the question card in the Studio preview panel -- exactly like it appears during actual gameplay. This will let you visually verify which icon is assigned to each question without needing to check the metadata section below.

### How It Works
In the production game screen, a `DynamicIcon` component is absolutely positioned above the `QuizQuestionCard`, overlapping its top edge by about 33px. The card itself uses `reserveTopSpace` to add padding so the icon doesn't cover the question text.

The Studio preview already passes `reserveTopSpace` but doesn't render the actual icon. We just need to add it.

### Technical Details

**File: `src/components/admin/studio/QuestionPreviewPanel.tsx`**

1. Import `DynamicIcon` from `@/components/shared/DynamicIcon`
2. Inside the "Game content" div, before the `QuizQuestionCard`, add a wrapper `div` with `relative` positioning
3. When the question has no media (no image/video/audio) and has an `icon_slug`, render a `DynamicIcon` component:
   - Absolutely positioned, centered horizontally, offset above the card top (`-top-[33px]`)
   - Using `question.icon_slug` as the slug
   - Size ~64px to match the smaller preview scale
   - `hideIfEmpty={true}` so nothing renders if no icon is assigned
   - `drop-shadow-lg` for the same visual treatment as gameplay
4. The existing `reserveTopSpace` prop on `QuizQuestionCard` already handles the padding -- no changes needed there

This mirrors the exact same pattern used in `QuizGameScreenProd.tsx` (lines 367-386).

