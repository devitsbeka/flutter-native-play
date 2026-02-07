

## Fix: Red-Stroked Unselectable Icons in Creator's Icon Picker

### What's Happening

The icon picker has an anti-spoiler system that blocks icons whose names match or resemble the correct answer. For example, if the answer is "ლომი" (lion), then icons like lion, elephant, eagle, whale, etc. get blocked because the system fuzzy-matches them.

This is useful when a **player** browsing icons shouldn't get a hint about the answer. But when you're the **creator/editor** of the trivia, you already know the answers -- so blocking icons is unnecessary and frustrating.

The `creatorMode` flag (which disables this filtering) already exists and works correctly in one place (`GameStylePersonalTrivia.tsx`), but it's **missing from 4 other editing screens**.

### Technical Changes

**Add `creatorMode` prop to all editing icon pickers:**

1. **`src/components/social/EditQuizModal.tsx`** (2 locations)
   - Line ~308: Quiz-level icon picker -- add `creatorMode`
   - Line ~477: Per-question icon picker -- add `creatorMode`

2. **`src/components/team/PersonalTriviaModal.tsx`** (1 location)
   - Line ~710: Per-question icon picker -- add `creatorMode`

3. **`src/components/social/EditRoundModal.tsx`** (1 location)
   - Line ~747: Per-question icon picker -- add `creatorMode`

4. **`src/components/social/EditQuestionDialog.tsx`** (1 location)
   - Line ~104: Question icon picker -- add `creatorMode`

Each change is simply adding one prop:
```typescript
<QuestionIconPicker
  // ...existing props...
  creatorMode  // <-- Add this line
/>
```

### Why This Fixes It

With `creatorMode={true}`, the `isIconSafe()` function returns `true` for all icons, removing the red stroke, the X button, and the disabled state. Creators can freely select any icon for their questions without the anti-spoiler restrictions.

### Files Changed
- `src/components/social/EditQuizModal.tsx` (2 locations)
- `src/components/team/PersonalTriviaModal.tsx` (1 location)
- `src/components/social/EditRoundModal.tsx` (1 location)
- `src/components/social/EditQuestionDialog.tsx` (1 location)

