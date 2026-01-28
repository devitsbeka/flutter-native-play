

# Plan: Fix Image Trivia Display on TV and Mobile

## Problem Summary

When playing image-type trivia on TV mode, the image is not displayed. This is because the media URLs (`image_url`, `video_url`, `audio_url`) are not being passed through when questions are loaded from the database into the TV context.

Additionally, mobile multiplayer players also don't see images because the multiplayer game screen doesn't pass media URLs to the question card component.

---

## Root Cause

In `TVGameContext.tsx`, there are two places where questions are parsed from the database:

1. **Initial join** (lines 1651-1667): Missing media fields
2. **Realtime updates** (lines 1819-1835): Missing media fields

Both locations map questions without including `image_url`, `video_url`, or `audio_url`, even though the `TVQuestion` interface already supports these fields.

---

## Changes Required

### 1. Fix TV Context - Question Parsing (TVGameContext.tsx)

**Location 1: Initial session join (around line 1654)**

Current code only parses basic fields:
```typescript
const rawQuestions = session.questions as unknown as Array<{
  id: string;
  question_text: string;
  correct_answer: string;
  options: string[];
  icon_slug?: string | null;
  // MISSING: image_url, video_url, audio_url
}>;
```

**Fix:** Add media fields to the type definition and mapping:
```typescript
const rawQuestions = session.questions as unknown as Array<{
  id: string;
  question_text: string;
  correct_answer: string;
  options: string[];
  icon_slug?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}>;
questions = rawQuestions.map(q => ({
  id: q.id,
  question_text: q.question_text,
  correct_answer: q.correct_answer,
  options: q.options,
  icon_slug: q.icon_slug,
  image_url: q.image_url,   // ADD
  video_url: q.video_url,   // ADD
  audio_url: q.audio_url,   // ADD
}));
```

**Location 2: Realtime subscription handler (around line 1822)**

Same fix needed - add media fields to type and mapping.

---

### 2. Update Mobile Multiplayer Screen (MultiplayerGameScreenV2.tsx)

The mobile multiplayer game screen needs to pass media URLs to the `QuizQuestionCard` so players see images during gameplay.

**Current code (around line 294):**
```typescript
<QuizQuestionCard
  questionText={currentQuestion.question}
  progressPercent={progressPercent}
  state="default"
  timerSeconds={Math.ceil(timeRemaining)}
  timerMaxSeconds={timePerQuestion}
  reserveTopSpace
/>
```

**Updated code:**
```typescript
<QuizQuestionCard
  questionText={currentQuestion.question}
  imageUrl={currentQuestion.imageUrl}
  videoUrl={currentQuestion.videoUrl}
  audioUrl={currentQuestion.audioUrl}
  progressPercent={progressPercent}
  state="default"
  timerSeconds={Math.ceil(timeRemaining)}
  timerMaxSeconds={timePerQuestion}
  reserveTopSpace={!currentQuestion.imageUrl && !currentQuestion.videoUrl && !currentQuestion.audioUrl}
/>
```

Also update the icon display to hide when there's media (around line 283):
```typescript
{!currentQuestion.imageUrl && !currentQuestion.videoUrl && !currentQuestion.audioUrl && (
  <div className="absolute left-1/2 -translate-x-1/2 -top-14 z-20 w-28 h-28">
    <DynamicIcon ... />
  </div>
)}
```

---

### 3. TV Layout (Already Implemented - No Changes Needed)

The TV question screen (`TVQuestionScreenV4.tsx`) already has the correct layout for image questions:
- **50/50 split layout** when `hasImage` is true
- **Left side**: Question text card + large image below
- **Right side**: Answer options stacked vertically (one per row)

This layout will automatically work once the media URLs are properly passed through from the context.

---

## Visual Comparison

### TV Screen - Image Trivia Layout (Existing)
```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [Player Avatars Status Bar - Wrong | Waiting | Correct]                 │
│                                                                         │
│ 📺 Category Name - რაუნდი 1/3                              ⏱️ 15       │
│                                                                         │
│ ┌──────────────────────────┐   ┌────────────────────────────────────┐  │
│ │    QUESTION TEXT CARD    │   │  ა | Answer Option 1               │  │
│ │  "რომელი ქვეყანაა ეს?"  │   ├────────────────────────────────────┤  │
│ └──────────────────────────┘   │  ბ | Answer Option 2               │  │
│                                 ├────────────────────────────────────┤  │
│ ┌──────────────────────────┐   │  გ | Answer Option 3               │  │
│ │                          │   ├────────────────────────────────────┤  │
│ │      [BIG IMAGE]         │   │  დ | Answer Option 4               │  │
│ │                          │   └────────────────────────────────────┘  │
│ │                          │                                           │
│ └──────────────────────────┘                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mobile Screen - Standard Image UI (Updated)
```text
┌─────────────────────────┐
│  ←  Question 3/5    ⏱️  │
│                         │
│ ┌─────────────────────┐ │
│ │     [IMAGE]         │ │
│ │                     │ │
│ ├─────────────────────┤ │
│ │  Question text here │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ ა  Answer 1         │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ ბ  Answer 2         │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ გ  Answer 3         │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ დ  Answer 4         │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘
```

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/contexts/TVGameContext.tsx` | Add `image_url`, `video_url`, `audio_url` to question parsing in 2 locations |
| `src/components/team/MultiplayerGameScreenV2.tsx` | Pass media URLs to QuizQuestionCard, conditionally hide icon when media present |

---

## Technical Notes

- The `TVQuestion` interface already includes `image_url`, `video_url`, `audio_url` fields (lines 34-36)
- The `QuizQuestionCard` component already supports `imageUrl`, `videoUrl`, `audioUrl` props
- The TV layout in `TVQuestionScreenV4.tsx` already has image-specific 50/50 split layout (lines 218-266)
- The question service (`questionService.ts`) already returns media URLs from the database

This fix is primarily about ensuring the data flows correctly through the context layer.

