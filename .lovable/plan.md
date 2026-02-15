
## Show Image Questions Clearly in Admin List

### Problem
In the admin question list, image-based questions display their `question_text` just like regular text questions. Since image questions hide the text from users (only the image is shown), admins can't easily tell which questions are image-only. The admin needs a clear visual indicator.

### Changes

#### File: `src/components/admin/studio/QuestionList.tsx`
- On line 139-141, where the question text is displayed, add a condition: if the question has an `image_url` (and `hideQuestionText` behavior applies), show **"სურათი"** in a styled/muted format instead of the question text
- This makes it immediately obvious which questions are image-only in the list

#### File: `src/components/admin/studio/QuestionPreviewPanel.tsx`
- In the preview panel's question details section, for image questions, also label them as "სურათი" so the admin sees consistent labeling

### Technical Details

**QuestionList.tsx (line 139-141)** - Replace the question text rendering:
```tsx
<p className="text-sm font-medium line-clamp-2 leading-snug">
  {question.image_url ? (
    <span className="text-blue-600 italic">სურათი</span>
  ) : (
    question.question_text
  )}
</p>
```

This way, image questions will show a blue "სურათი" label in the list, making it instantly clear which questions rely on images rather than text.
