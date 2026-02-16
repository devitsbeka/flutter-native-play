
## Add Icon Picker to Admin Create Question Modal

### What Changes
Add the existing `QuestionIconPicker` component to the "Create Question" form in Question Studio, so admins can set an icon when adding a new question (not just when editing).

### File: `src/components/admin/studio/CreateQuestionModal.tsx`

1. **Import** `QuestionIconPicker` from `@/components/social/QuestionIconPicker`
2. **Add `icon_slug` state** to the form object (default: `''`)
3. **Reset** `icon_slug` in `resetForm()`
4. **Render** the `QuestionIconPicker` above the question text field in the form, centered, using the `large` and `creatorMode` props (same pattern as `EditQuestionDialog`)
5. **Pass** `icon_slug` to the submitted `questionData` in `handleSubmit`

The icon picker will appear at the top of the form (after category selection), allowing the admin to pick a 3D icon before or after filling in the question text. Since this is a creation flow, `creatorMode` will be enabled to skip anti-spoiler filtering.
