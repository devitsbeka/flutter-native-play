

## Add Image Question Indicators in Content Manager

### Problem
When browsing questions in the Content Manager, there's no visual distinction between text questions and image questions. This makes it confusing for admins -- they don't know whether a question needs an icon or if it's an image question that already has its own visual.

### Changes

**1. Update `AdminQuestion` interface** (`src/hooks/useAdminQuestions.ts`)
- Add `image_url`, `video_url`, and `audio_url` optional fields to the interface so the Content Manager can detect media questions.

**2. Question List (Column 2)** (`src/pages/admin/ContentManager.tsx`, lines 508-569)
- For image questions: show a thumbnail + "suraTi" label instead of the question text, similar to what QuestionList.tsx already does.
- Hide the DynamicIcon (3D icon) for image questions since they don't need one.
- Add a small image/video/audio type badge next to the difficulty badge.

**3. Question Detail Panel (Column 3)** (`src/pages/admin/ContentManager.tsx`, lines 662-724)
- For image questions: replace the "Question Text" section with the image preview.
- Hide the icon picker in the preview mockup for image questions (since they don't use icons).
- Pass `imageUrl`, `hideQuestionText` props to `QuestionMockupPreview` if it supports them, or show the image inline.
- Add a clear badge like "suraTiani kiTxva -- ar saWiroebs ikons" (Image question -- no icon needed).

### Technical Details

**File: `src/hooks/useAdminQuestions.ts`**
- Add to `AdminQuestion` interface: `image_url?: string | null`, `video_url?: string | null`, `audio_url?: string | null`

**File: `src/pages/admin/ContentManager.tsx`**
- Column 2 question items: wrap question text display in a conditional -- if `image_url` exists, show a thumbnail and "suraTi" label instead
- Column 3 detail: conditionally show image preview, hide icon picker for image questions
- Add `Image` icon import from lucide-react

