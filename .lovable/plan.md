
# Fix Play Button on Video Blob + Speed Up Mixed Category Start

## Issue 1: Play Button on Category Video Blob

The `InteractiveBlobVideo` component renders a `<video>` element that sometimes shows a browser-native play button overlay (visible in the screenshot on the philosophy category blob). This happens because iOS Safari and some browsers display a default play indicator.

**Fix**: Add `controls={false}` attribute explicitly and use CSS `pointer-events: none` + webkit-specific styles to suppress the native play button overlay on the video element.

**File**: `src/components/game/InteractiveBlobVideo.tsx` (line ~167-176)

## Issue 2: Mixed Category Delay When Starting Game

When the user clicks "Play" on the VS screen, `beginPlaying(categoryId)` is called which then fetches questions on-the-fly. For mixed category (`__mixed__`), this triggers a broader query across all categories, making it slower.

**Fix**: Pre-fetch questions during the VS screen animation (while the slot machine is spinning), so by the time the user clicks "Play", questions are already loaded. This eliminates the delay entirely.

**Changes in** `src/components/game/VSScreen.tsx`:
- When `stage` transitions to `"category-found"`, immediately start pre-fetching questions for the selected category in the background
- Store pre-fetched questions in a ref
- Pass pre-fetched questions to `beginPlaying` (or modify `beginPlaying` to accept pre-loaded questions)

**Changes in** `src/contexts/GameContext.tsx`:
- Add an optional `preloadedQuestions` parameter to `beginPlaying` so it can skip fetching if questions are already available

## Technical Details

### InteractiveBlobVideo.tsx
Add to the `<video>` element:
- `style={{ pointerEvents: 'none' }}` to prevent interaction
- A CSS class with `webkit-media-controls` overrides to hide the play button

### VSScreen.tsx
- Add a `prefetchedQuestionsRef` to store questions fetched during animation
- In the `category-found` stage effect (line ~234), call `fetchQuestions()` for the selected category
- Modify `handleStart` to pass pre-fetched questions to `beginPlaying`

### GameContext.tsx
- Update `beginPlaying` signature to accept optional pre-loaded questions: `beginPlaying(categoryId: string, preloadedQuestions?: TriviaQuestion[])`
- If `preloadedQuestions` is provided and non-empty, skip the fetch step entirely

## File Changes Summary

| File | Change |
|---|---|
| `src/components/game/InteractiveBlobVideo.tsx` | Suppress native video play button with CSS |
| `src/components/game/VSScreen.tsx` | Pre-fetch questions when category is revealed |
| `src/contexts/GameContext.tsx` | Accept optional pre-loaded questions in `beginPlaying` |
