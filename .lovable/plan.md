
# Add Video Trivia and Sound Trivia Categories

## Overview

Following the same pattern as Image Trivia, we'll add two new specialized trivia categories:
1. **Video Trivia** (ვიდეო ტრივია) - Questions with embedded video clips
2. **Sound Trivia** (ხმის ტრივია) - Questions with audio-only clips

These will reuse the existing game UI with new media display components in the question card.

---

## Database Changes

### 1. Add `video_url` and `audio_url` columns to questions table

```sql
ALTER TABLE questions
ADD COLUMN video_url TEXT DEFAULT NULL,
ADD COLUMN audio_url TEXT DEFAULT NULL;
```

### 2. Create new categories

```sql
-- Video Trivia category
INSERT INTO categories (
  category_id, name, icon, icon_slug, color, description,
  total_levels, type, is_active, sort_order, language, is_language_specific
) VALUES (
  'video_trivia',
  'ვიდეო ტრივია',
  '🎬',
  'video-camera',
  'from-red-500 to-orange-600',
  'გამოიცანი ვიდეოში რა ხდება',
  1, 'fun', true, 47, 'ka', false
);

-- Sound Trivia category
INSERT INTO categories (
  category_id, name, icon, icon_slug, color, description,
  total_levels, type, is_active, sort_order, language, is_language_specific
) VALUES (
  'sound_trivia',
  'ხმის ტრივია',
  '🎧',
  'headphones',
  'from-blue-500 to-cyan-600',
  'გამოიცანი ხმა რას ეკუთვნის',
  1, 'fun', true, 48, 'ka', false
);
```

### 3. Insert 10 initial questions for each category

Questions will have:
- **Video Trivia**: Short video URL + 2-3 word question (e.g., "რა ცხოველია?", "ვინ არის?")
- **Sound Trivia**: Audio URL + short question (e.g., "რა ინსტრუმენტია?", "ვინ მღერის?")

---

## Frontend Changes

### 1. Update interfaces in `src/services/questionService.ts`

Add new fields to `RawQuestion` and `FormattedQuestion`:

```typescript
interface RawQuestion {
  // ... existing fields
  video_url?: string | null;
  audio_url?: string | null;
}

export interface FormattedQuestion {
  // ... existing fields
  videoUrl?: string | null;
  audioUrl?: string | null;
}
```

Update `formatQuestion()` function to include new fields.

### 2. Update all SELECT queries in `questionService.ts`

Add `video_url, audio_url` to all question fetch queries.

### 3. Update `TriviaQuestion` interface in `src/hooks/useTrivia.ts`

```typescript
export interface TriviaQuestion {
  // ... existing fields
  videoUrl?: string;
  audioUrl?: string;
}
```

### 4. Update `QuizQuestionCard` component

Add video and audio rendering support with play controls:

```typescript
interface QuizQuestionCardProps {
  // ... existing props
  videoUrl?: string | null;
  audioUrl?: string | null;
}

// Render video player (auto-play, muted with click to unmute)
{hasVideo && (
  <div className="w-full h-44 overflow-hidden bg-black">
    <video 
      src={videoUrl!}
      className="w-full h-full object-cover"
      autoPlay
      loop
      muted
      playsInline
    />
  </div>
)}

// Render audio player (waveform visualization + play button)
{hasAudio && (
  <div className="w-full h-32 flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600">
    <AudioPlayer src={audioUrl!} />
  </div>
)}
```

### 5. Create `AudioPlayer` component

A simple audio player with:
- Play/Pause button (large, centered)
- Progress bar
- Visual waveform animation
- Auto-play on question load

Location: `src/components/ui/audio-player.tsx`

### 6. Update `CategoryQuizPage.tsx`

Pass video and audio URLs to the question card:

```typescript
interface TriviaQuestion {
  // ... existing fields
  video_url?: string | null;
  audio_url?: string | null;
}

// In question mapping
const mapped = result.questions.map(q => ({
  // ... existing fields
  video_url: q.videoUrl,
  audio_url: q.audioUrl,
}));

// Pass to card
<QuizQuestionCard
  questionText={currentQuestion?.question || ""}
  imageUrl={currentQuestion?.image_url}
  videoUrl={currentQuestion?.video_url}
  audioUrl={currentQuestion?.audio_url}
  reserveTopSpace={!currentQuestion?.image_url && !currentQuestion?.video_url && !currentQuestion?.audio_url}
/>
```

### 7. Update icon visibility logic

Hide category icon when video/audio is present (same as image):

```typescript
{!currentQuestion?.image_url && !currentQuestion?.video_url && !currentQuestion?.audio_url && (
  <DynamicIcon ... />
)}
```

---

## File Changes Summary

| Component | Change |
|-----------|--------|
| Database: `questions` | Add `video_url`, `audio_url` columns |
| Database: `categories` | Insert 2 new categories |
| Database: `questions` | Insert 20 sample questions (10 each) |
| `src/services/questionService.ts` | Add video/audio to interfaces and queries |
| `src/hooks/useTrivia.ts` | Add video/audio to interface |
| `src/components/ui/quiz-question-card.tsx` | Add video/audio rendering |
| `src/components/ui/audio-player.tsx` | NEW - Audio player component |
| `src/pages/CategoryQuizPage.tsx` | Pass video/audio to card |
| `src/components/game/QuizGameScreenProd.tsx` | Pass video/audio to card |

---

## Media Format

### Video Questions
- **Format**: MP4, short clips (5-15 seconds)
- **Display**: Auto-play, muted, looped
- **Question**: 2-3 words (e.g., "რომელი ფილმია?", "რა სპორტია?")

### Audio Questions
- **Format**: MP3/WAV clips (5-20 seconds)
- **Display**: Large play button with waveform animation
- **Question**: 2-3 words (e.g., "რომელი სიმღერაა?", "რა ცხოველია?")

The existing game UI handles timer, answers, power-ups, and scoring - only the question card gets new media rendering capabilities.
