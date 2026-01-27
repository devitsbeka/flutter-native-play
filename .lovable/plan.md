
# Question Studio Enhancement: Create Question Modal + URL Import with Media Support

## Overview

This plan adds two major features to Question Studio (`/admin/question-studio`):
1. **Create New Question Modal** - A comprehensive form to manually create questions with support for all media types (text, image, video, audio)
2. **URL Import Tool** - Smart Wikipedia/web URL parser that extracts content and creates media-based questions with AI assistance

---

## Current Architecture Summary

| Component | Purpose |
|-----------|---------|
| `src/pages/admin/QuestionStudio.tsx` | Main page with 3-panel layout |
| `src/hooks/useQuestionStudio.ts` | State management, CRUD operations |
| `src/components/admin/studio/*` | UI components (list, preview, filters) |
| Database `questions` table | Stores all fields including `image_url`, `video_url`, `audio_url` |
| Existing edge functions | `parse-quiz-url`, `fetch-url-metadata` for web scraping |

---

## Feature 1: Create New Question Modal

### UI Design

A full-featured modal with:
- **Step 1: Question Type Selection** - Cards for Text, Image, Video, Audio
- **Step 2: Question Details Form** - Dynamic fields based on type

### Form Fields

| Field | All Types | Image | Video | Audio |
|-------|-----------|-------|-------|-------|
| Category | Required | Required | Required | Required |
| Question Text | Required | Required (short prompt) | Required (short prompt) | Required (short prompt) |
| Correct Answer | Required | Required | Required | Required |
| Incorrect Answers (3) | Required | Required | Required | Required |
| Difficulty | Required | Required | Required | Required |
| Image URL | - | Required | - | - |
| Video URL | - | - | Required | - |
| Audio URL | - | - | - | Required |
| Icon Slug | Optional | Hidden | Hidden | Hidden |

### New Files

```text
src/components/admin/studio/CreateQuestionModal.tsx
src/components/admin/studio/QuestionTypeSelector.tsx
src/components/admin/studio/MediaPreview.tsx
```

### Implementation Details

1. **QuestionTypeSelector.tsx**
   - 4 clickable cards with icons (FileText, Image, Video, Volume2)
   - Visual selection state with purple highlight
   - Georgian labels: ტექსტი, სურათი, ვიდეო, აუდიო

2. **CreateQuestionModal.tsx**
   - Two-step wizard (type -> form)
   - Form validation using existing `CHAR_LIMITS` from `useQuestionParser`
   - Category dropdown using `useAdminCategories`
   - For media types: URL input + live preview
   - Submit creates question via `useQuestionStudio.addQuestion()` (new method needed)

3. **MediaPreview.tsx**
   - Renders image/video/audio preview based on URL
   - Error handling for broken URLs
   - Video: muted autoplay loop preview
   - Audio: waveform visualization or simple player

### Hook Enhancement (useQuestionStudio.ts)

Add `addQuestion` method:

```typescript
const addQuestion = useCallback(async (question: Omit<StudioQuestion, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .insert({
        category_id: question.category_id,
        question_text: question.question_text,
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers,
        difficulty: question.difficulty,
        level_number: question.level_number || 1,
        is_active: true,
        in_production: false,
        icon_slug: question.icon_slug,
        image_url: question.image_url,
        video_url: question.video_url,
        audio_url: question.audio_url,
      })
      .select()
      .single();
    
    if (error) throw error;
    toast.success('კითხვა შეიქმნა');
    fetchQuestions();
    fetchCategories();
    return data;
  } catch (err) {
    console.error('Error adding question:', err);
    toast.error('კითხვის შექმნა ვერ მოხერხდა');
    return null;
  }
}, [fetchQuestions, fetchCategories]);
```

---

## Feature 2: URL Import Tool

### Workflow

```text
1. User enters URL (e.g., Wikipedia article)
2. User selects question type: Text, Image, Video, or Audio
3. User sets question count (1-10)
4. System:
   a. Scrapes URL content via Firecrawl
   b. If Image: Extracts main image from page
   c. If Video: Prompts for YouTube URL, downloads/converts to MP4
   d. If Audio: Looks for audio files or uses TTS
   e. AI generates questions based on content
5. User reviews and approves questions
6. Import to selected category
```

### New Edge Function: `parse-wikipedia-media`

This function will:
1. Accept URL and desired question type
2. Use Firecrawl to scrape content
3. Extract media based on type:
   - **Image**: Parse `<img>` tags, prioritize infobox/main images
   - **Video**: Return indicator that YouTube URL is needed
   - **Audio**: Look for `.mp3`, `.ogg` links or Wikipedia audio files
4. Return structured data for AI question generation

```typescript
// supabase/functions/parse-wikipedia-media/index.ts

interface ParseRequest {
  url: string;
  questionType: 'text' | 'image' | 'video' | 'audio';
  questionCount: number;
}

interface ParseResponse {
  success: boolean;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  needsExternalMedia?: boolean; // True for video (needs YouTube URL)
  suggestedQuestions?: Array<{
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    difficulty: string;
  }>;
}
```

### New Edge Function: `download-youtube-video`

For video questions, we need to:
1. Accept YouTube URL
2. Download video (short clip, max 30 seconds)
3. Upload to Supabase Storage (new bucket: `question-media`)
4. Return public URL

**Important**: YouTube downloading requires external service or library. Options:
- Use `ytdl-core` equivalent for Deno
- Use a third-party API like RapidAPI YouTube Downloader
- Manual approach: Ask user to provide direct video URL

**Recommended approach**: Ask user for direct video file URL or let them upload, as YouTube downloading is legally complex and unreliable.

### New Storage Bucket

Create `question-media` bucket for storing:
- Video files (MP4)
- Audio files (MP3)
- Images (if we want to cache them)

```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('question-media', 'question-media', true);

-- RLS policies for admin access
CREATE POLICY "Admins can upload media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'question-media' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can view media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'question-media');
```

### Frontend Component: URLImportTool.tsx

Located in `src/components/admin/studio/URLImportTool.tsx`:

```text
┌─────────────────────────────────────────────────────────┐
│  URL იმპორტი                                           │
├─────────────────────────────────────────────────────────┤
│  URL: [________________________] [სკანირება]            │
│                                                         │
│  კითხვის ტიპი:                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ ტექსტი │ │ სურათი │ │ ვიდეო  │ │ აუდიო  │           │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
│                                                         │
│  რაოდენობა: [5 ▼]                                       │
│                                                         │
│  [დაგენერირება]                                         │
├─────────────────────────────────────────────────────────┤
│  Preview Section (after scan)                           │
│  - Page title, favicon                                  │
│  - Extracted media preview                              │
│  - Generated questions list with approve/reject         │
├─────────────────────────────────────────────────────────┤
│  კატეგორია: [აირჩიეთ ▼]    [იმპორტი]                    │
└─────────────────────────────────────────────────────────┘
```

### Video Handling Special Case

Since YouTube downloading is complex, implement a hybrid approach:

1. **Option A - Direct URL**: User provides direct video file URL (e.g., from Vimeo, own hosting)
2. **Option B - Upload**: User uploads video file directly
3. **Option C - YouTube Embed**: Store YouTube video ID, render using custom player

For Option C, modify video display logic:
```typescript
// Detect YouTube URLs and convert to embed
const isYouTube = videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be');
if (isYouTube) {
  const videoId = extractYouTubeId(videoUrl);
  // Render iframe or custom YouTube player
}
```

---

## Database Changes

No schema changes needed - the `questions` table already has:
- `image_url` (text, nullable)
- `video_url` (text, nullable)  
- `audio_url` (text, nullable)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/studio/CreateQuestionModal.tsx` | Main creation modal |
| `src/components/admin/studio/QuestionTypeSelector.tsx` | Type selection UI |
| `src/components/admin/studio/MediaPreview.tsx` | Media preview component |
| `src/components/admin/studio/URLImportTool.tsx` | URL import feature |
| `src/components/admin/studio/VideoInput.tsx` | YouTube/video URL input |
| `supabase/functions/parse-wikipedia-media/index.ts` | Wikipedia media extraction |
| `supabase/functions/generate-media-questions/index.ts` | AI question generation for media |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/QuestionStudio.tsx` | Add "+" button, modal trigger, URL import tab |
| `src/hooks/useQuestionStudio.ts` | Add `addQuestion` method |

---

## Integration Points

### Question Studio Header Enhancement

Add creation controls to the header:

```tsx
// In QuestionStudio.tsx header section
<div className="flex items-center gap-2">
  <Button onClick={() => setShowCreateModal(true)}>
    <Plus className="h-4 w-4 mr-1" />
    ახალი კითხვა
  </Button>
  <Button variant="outline" onClick={() => setShowURLImport(true)}>
    <Link2 className="h-4 w-4 mr-1" />
    URL იმპორტი
  </Button>
</div>
```

---

## Technical Considerations

### Video Storage Limits
- Supabase Storage: 50MB file size limit per upload
- Recommend: Max 30-second clips, compressed MP4
- Video processing could be done client-side using browser APIs

### Audio Handling
- Support: MP3, WAV, OGG formats
- Wikipedia audio files are usually OGG (Vorbis)
- Consider: Text-to-Speech as fallback for audio questions

### Error Handling
- URL validation before scraping
- Media URL validation (check if accessible)
- Graceful fallbacks when media extraction fails
- Loading states for all async operations

---

## Implementation Order

1. Create storage bucket `question-media` with RLS policies
2. Add `addQuestion` method to `useQuestionStudio`
3. Build `QuestionTypeSelector` component
4. Build `MediaPreview` component
5. Build `CreateQuestionModal` with form logic
6. Integrate modal into QuestionStudio page
7. Create `parse-wikipedia-media` edge function
8. Create `generate-media-questions` edge function
9. Build `URLImportTool` component
10. Add URL import to QuestionStudio page
11. Testing and refinement

---

## Summary

This enhancement transforms Question Studio into a comprehensive content management tool that supports:
- Manual creation of any question type with live preview
- Intelligent URL parsing for Wikipedia and other websites
- Media extraction and question generation
- Seamless integration with existing category/production workflow
