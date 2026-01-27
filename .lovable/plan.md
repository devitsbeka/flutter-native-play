
# Add Image Trivia Category

## Overview

Create a new "Image Trivia" category that displays images with very short questions (2-3 words) and 4 possible answers. This will be a unique trivia type that focuses on visual recognition rather than text-heavy questions.

---

## Database Changes

### 1. Add `image_url` column to questions table

```sql
ALTER TABLE questions
ADD COLUMN image_url TEXT DEFAULT NULL;
```

### 2. Create the new "Image Trivia" category

```sql
INSERT INTO categories (
  category_id,
  name,
  icon,
  icon_slug,
  color,
  description,
  total_levels,
  type,
  is_active,
  sort_order,
  language,
  is_language_specific
) VALUES (
  'image_trivia',
  'სურათების ტრივია',
  '🖼️',
  'image-gallery',
  'from-pink-500 to-purple-600',
  'გამოიცანი სურათზე რა არის ნაჩვენები',
  1,
  'fun',
  true,
  46,
  'ka',
  false
);
```

### 3. Insert 10 initial Image Trivia questions

Questions will have:
- Short question text (2-3 words like "ვინ არის?", "რა ხილია?", "რომელი ქალაქი?")
- Image URL from public sources or Supabase storage
- 4 answer options

```sql
-- Example questions (10 total)
INSERT INTO questions (
  category_id,
  question_text,
  correct_answer,
  incorrect_answers,
  difficulty,
  level_number,
  is_active,
  in_production,
  language,
  image_url
) VALUES
-- Question 1: Eiffel Tower
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რომელი ქალაქია?',
 'პარიზი',
 '["ლონდონი", "რომი", "ბერლინი"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=400&q=80'),
 
-- Question 2: Lion
((SELECT id FROM categories WHERE category_id = 'image_trivia'),
 'რომელი ცხოველია?',
 'ლომი',
 '["ვეფხვი", "ჯაგუარი", "ლეოპარდი"]',
 'easy', 1, true, true, 'ka',
 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=400&q=80'),
 
-- ... 8 more questions with various subjects
```

---

## Frontend Changes

### 1. Update `TriviaQuestion` interface (src/hooks/useTrivia.ts)

Add `imageUrl` field to track image questions:

```typescript
export interface TriviaQuestion {
  // ... existing fields
  imageUrl?: string;  // Already exists, just ensure it's populated
  isImageQuestion?: boolean;  // New flag for image-based questions
}
```

### 2. Update `FormattedQuestion` interface (src/services/questionService.ts)

Add image_url to the formatted question output:

```typescript
export interface FormattedQuestion {
  // ... existing fields
  imageUrl?: string;
}

// Update formatQuestion function to include image_url
function formatQuestion(q: RawQuestion, categoryName?: string, categorySlug?: string): FormattedQuestion {
  // ... existing code
  return {
    // ... existing fields
    imageUrl: q.image_url,
  };
}
```

### 3. Update RawQuestion interface (src/services/questionService.ts)

```typescript
interface RawQuestion {
  // ... existing fields
  image_url?: string | null;
}
```

### 4. Update QuizQuestionCard component (src/components/ui/quiz-question-card.tsx)

Add optional `imageUrl` prop and conditional image rendering:

```typescript
interface QuizQuestionCardProps {
  // ... existing props
  imageUrl?: string;
}

// In the component:
{imageUrl && (
  <div className="w-full h-40 overflow-hidden rounded-t-2xl">
    <img 
      src={imageUrl} 
      alt="Question" 
      className="w-full h-full object-cover"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  </div>
)}
```

### 5. Update QuizGameScreenProd (src/components/game/QuizGameScreenProd.tsx)

Pass imageUrl to the QuizQuestionCard:

```typescript
<QuizQuestionCard
  questionText={currentQuestion.question}
  imageUrl={currentQuestion.imageUrl}
  // ... other props
/>
```

### 6. Update question fetching queries

In `questionService.ts`, update all SELECT queries to include `image_url`:

```typescript
.select('id, question_text, correct_answer, incorrect_answers, difficulty, level_number, icon_slug, image_url')
```

---

## Technical Summary

| Component | Change |
|-----------|--------|
| Database: `questions` | Add `image_url` column |
| Database: `categories` | Insert new "Image Trivia" category |
| Database: `questions` | Insert 10 initial image questions |
| `src/hooks/useTrivia.ts` | Ensure `imageUrl` is passed through |
| `src/services/questionService.ts` | Add `image_url` to queries and formatting |
| `src/components/ui/quiz-question-card.tsx` | Add image display support |
| `src/components/game/QuizGameScreenProd.tsx` | Pass `imageUrl` to card |

---

## Image Questions Format

Each image question follows this pattern:
- **Image**: A clear, recognizable image (landmark, animal, person, object)
- **Question**: 2-3 word prompt ("ვინ არის?", "რა არის?", "რომელი ქვეყანა?")
- **Answers**: 4 options, all similar in type (all cities, all animals, all fruits, etc.)

The existing game UI will display the image prominently above the short question text, making it visually engaging while reusing all existing answer button, timer, and power-up mechanics.
