

## Fix Challenge Game Screen UI + Remove "ოთახში დაბრუნება" Button

### Problem
1. The challenge game screen (when a friend follows your link) shows a plain white background with basic styling, instead of matching the main game's purple UI
2. The "ოთახში დაბრუნება" button on the results screen is redundant since the back arrow button already does the same thing

### Changes

#### 1. Restyle `src/pages/ChallengeLanding.tsx` - Playing Phase
Replace the plain white playing screen with the same purple game UI used in `QuizGameScreenProd`:
- Background: `bg-[#7E7ADB]` instead of `bg-background`
- Add proper header with back button (rounded, white/10 bg), category name (center), and `TimerBadge` component (right)
- Add `DynamicIcon` overlapping the question card (using `category_icon_slug` from challenge data)
- Add `QuizProgressDots` between question and answers
- Style answer buttons area to match main game spacing and layout
- White text throughout, matching the main game aesthetic

#### 2. Restyle `src/pages/ChallengeLanding.tsx` - Landing Phase
- Change from `bg-background` to `bg-[#7E7ADB]` purple background
- Update text colors to white/white-opacity to match purple theme

#### 3. Restyle `src/pages/ChallengeLanding.tsx` - Results Phase
- Change from `bg-background` to `bg-[#7E7ADB]` purple background
- Update score cards and text to use white/purple-themed styling

#### 4. Remove "ოთახში დაბრუნება" button from `src/components/team/GameResultsScreenV2.tsx`
- Remove the `ChunkyButton` with `backToRoom` text in both the host section (around line 617-628) and non-host section (around line 636-644)
- Keep the back arrow button in the header (line 382-385) which already calls `handleBackToRoom`

### Technical Details

**Files to modify:**
| File | Change |
|------|--------|
| `src/pages/ChallengeLanding.tsx` | Apply purple `bg-[#7E7ADB]` theme to all 3 phases, add `TimerBadge`, `DynamicIcon`, `QuizProgressDots` components, match main game layout |
| `src/components/team/GameResultsScreenV2.tsx` | Remove both "ოთახში დაბრუნება" `ChunkyButton` instances (host + non-host sections) |

**New imports for ChallengeLanding.tsx:**
- `TimerBadge` from `@/components/game/TimerBadge`
- `DynamicIcon` from `@/components/shared/DynamicIcon`
- `QuizProgressDots` from `@/components/ui/quiz-progress-dots`
- `ArrowLeft` from lucide-react
