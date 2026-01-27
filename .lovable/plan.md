
# Fix Image Display in Game: Full Image + No Difficulty Badge

## Issues Found

From the screenshots, I can see two problems with image-based trivia questions during gameplay:

1. **Image is cropped** - Abraham Lincoln's head is cut off at the top
2. **"საშუალო" (Medium) difficulty badge appears** - This badge overlays the image in the top-right corner, covering content

## Root Cause Analysis

### Issue 1: Image Cropping

In `src/components/ui/quiz-question-card.tsx`, line 100:
```tsx
<div className="w-full h-48 overflow-hidden">
  <img className="w-full h-full object-cover object-top" />
</div>
```

The fixed `h-48` (192px) height with `object-cover` forces cropping on portrait images. Even with `object-top`, taller images get clipped.

### Issue 2: Difficulty Badge on Image Questions

In `src/components/game/QuizGameScreenProd.tsx`, lines 384-385:
```tsx
difficultyLabel={!opponent ? getDifficultyLabel(currentQuestion.difficulty) : undefined}
difficultyColor={!opponent ? DIFFICULTY_COLORS[currentQuestion.difficulty] || DIFFICULTY_COLORS.medium : undefined}
```

The condition only checks `!opponent` (solo mode) but doesn't exclude image/video/audio questions. This causes the badge to render on top of media content.

## Solution

### File 1: `src/components/ui/quiz-question-card.tsx`

Change the image container to use `object-contain` instead of `object-cover` to show the full image without cropping:

```tsx
{/* Image for Image Trivia questions */}
{hasImage && !hasVideo && !hasAudio && (
  <div className="w-full h-52 overflow-hidden bg-gray-100 flex items-start justify-center">
    <img 
      src={imageUrl!} 
      alt="Question" 
      className="w-full h-full object-contain object-top"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  </div>
)}
```

Key changes:
- `object-cover` → `object-contain`: Shows full image without cropping
- `h-48` → `h-52`: Slightly more height for better display
- Added `bg-gray-100`: Subtle background for letterboxing if needed
- Added `flex items-start justify-center`: Centers image while aligning to top

### File 2: `src/components/game/QuizGameScreenProd.tsx`

Update the condition to hide difficulty badge when media is present:

```tsx
// Lines 384-385: Add media check to hide difficulty badge for image/video/audio questions
const hasMedia = currentQuestion.imageUrl || currentQuestion.videoUrl || currentQuestion.audioUrl;

// In QuizQuestionCard props:
difficultyLabel={!opponent && !hasMedia ? getDifficultyLabel(currentQuestion.difficulty) : undefined}
difficultyColor={!opponent && !hasMedia ? DIFFICULTY_COLORS[currentQuestion.difficulty] || DIFFICULTY_COLORS.medium : undefined}
```

This ensures:
- Solo mode still shows difficulty badge for text-only questions
- Image/video/audio questions never show the overlapping badge

## Visual Result

**Before:**
- Image cropped at top (Lincoln's hair/head cut off)
- "საშუალო" badge overlaying image corner

**After:**
- Full image displayed with `object-contain` (entire portrait visible)
- No difficulty badge on media questions

## Summary of Changes

| File | Change |
|------|--------|
| `quiz-question-card.tsx` | Change `object-cover` → `object-contain`, increase height to `h-52` |
| `QuizGameScreenProd.tsx` | Add `!hasMedia` condition to hide difficulty badge for image questions |
