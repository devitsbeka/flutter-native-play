
# Admin Question Studio - Complete Content Management System

## Overview

Build a brand new, comprehensive admin page for bulk question management with **100% replica live previews** of all 4 question types (Text, Image, Video, Audio). The system will feature two primary navigation tabs (**Library** vs **Production**), advanced filtering, bulk actions, and seamless navigation between questions with real-time design previews.

---

## Core Architecture

### New Page: `/admin/question-studio`

A dedicated full-screen admin experience replacing/augmenting the current ContentManager with:
- **Two-tab layout**: Library (in_production=false) vs Production (in_production=true)
- **Three-panel design**: Categories sidebar | Questions list | Live Preview Panel
- **Real-time sync** with database changes

---

## UI Layout

```text
┌────────────────────────────────────────────────────────────────────────┐
│  [📚 Library]  [🚀 Production]                        [Bulk Actions ▼] │
├──────────────┬─────────────────────────┬───────────────────────────────┤
│ CATEGORIES   │  QUESTIONS              │  LIVE PREVIEW                 │
│              │                         │                               │
│ 🔍 Search    │  🔍 Search   [Filters▼] │  ┌─────────────────────────┐  │
│              │                         │  │      iPhone Frame       │  │
│ ○ All (523)  │  ☑ Question 1 [Text]   │  │  ┌───────────────────┐  │  │
│ ● Sports(42) │  ☐ Question 2 [Image]  │  │  │    Game Screen    │  │  │
│ ○ Movies(89) │  ☐ Question 3 [Video]  │  │  │   with answers    │  │  │
│ ○ Music (34) │  ☐ Question 4 [Audio]  │  │  │   and media       │  │  │
│              │                         │  │  └───────────────────┘  │  │
│ [+Add]       │  Page 1/10  [← →]      │  └─────────────────────────┘  │
│              │                         │  [◀ Prev] [Edit] [Next ▶]    │
│              │  Selected: 3           │  [Push to Prod] [Remove Icon] │
└──────────────┴─────────────────────────┴───────────────────────────────┘
```

---

## Key Features

### 1. Primary Navigation Tabs
- **Library Tab**: Shows questions where `in_production = false`
- **Production Tab**: Shows questions where `in_production = true`
- Tab badges show total count for each state
- Switching tabs resets filters and selection

### 2. Categories Panel (Left Sidebar)
- Scrollable list of all categories with question counts
- Counts are split: `(Library / Production)` format
- Search filter for category name
- "All Categories" option at top
- Click to filter questions by category
- Visual indicator showing which categories have Library vs Production content

### 3. Questions Panel (Center)
- Checkbox selection for bulk operations
- **Advanced Filters Dropdown**:
  - Question Type: All | Text | Image | Video | Audio
  - Difficulty: All | Easy | Medium | Hard
  - Has Icon: All | With Icon | Without Icon
  - Date Range: Created after / before
  - Sort: Newest | Oldest | Alphabetical
- Search by question text, answer, or ID
- Pagination with adjustable page size (25/50/100)
- Inline badges: Type indicator (📝/🖼️/🎬/🎧), Difficulty chip, Icon status
- Multi-select with Shift+Click range selection
- Row click opens in preview panel

### 4. Live Preview Panel (Right)
- **100% replica of production game UI** in an iPhone frame
- Dynamic preview based on question type:
  - **Text**: Standard QuizQuestionCard with icon
  - **Image**: Card with image at top, short question below
  - **Video**: Card with auto-playing muted video loop
  - **Audio**: Card with AudioPlayer waveform and controls
- **Navigation arrows** (Prev/Next) to browse through filtered questions
- Edit button opens inline editing modal
- Quick actions:
  - Toggle production status
  - Assign/change icon
  - Duplicate question
  - Delete question

### 5. Bulk Actions Toolbar
Appears when items are selected:
- **Push to Production**: Move selected from Library → Production
- **Remove from Production**: Move selected from Production → Library
- **Bulk Assign Icon**: Open icon picker for all selected
- **Bulk Change Difficulty**: Dropdown to set difficulty
- **Bulk Delete**: With confirmation dialog
- **Export Selected**: Download as JSON/CSV
- **Duplicate Selected**: Create copies in Library

---

## Database Considerations

### Required Query Modifications
The `AdminQuestion` interface and `useAdminQuestions` hook need to include:
```typescript
interface AdminQuestion {
  // ... existing fields
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  language?: string;
}
```

### Production Status Filter
Add `productionStatus` parameter to `useAdminQuestions`:
```typescript
useAdminQuestions(categoryId, searchTerm, {
  inProduction: boolean | null, // null = all, true = prod, false = lib
  questionType: 'text' | 'image' | 'video' | 'audio' | null,
  difficulty: 'easy' | 'medium' | 'hard' | null,
  hasIcon: boolean | null,
})
```

---

## Components to Create

### 1. `src/pages/admin/QuestionStudio.tsx`
Main page with three-panel layout and tab navigation

### 2. `src/components/admin/studio/`
- `StudioTabs.tsx` - Library/Production tab switcher with counts
- `CategorySidebar.tsx` - Categories list with filtering
- `QuestionList.tsx` - Paginated, filterable question list with checkboxes
- `QuestionFilters.tsx` - Advanced filter dropdown
- `QuestionPreviewPanel.tsx` - Live preview with navigation
- `BulkActionsBar.tsx` - Floating toolbar for bulk operations
- `QuestionTypeIndicator.tsx` - Icon/badge for question type

### 3. `src/components/admin/studio/previews/`
- `TextQuestionPreview.tsx` - Standard text question in phone frame
- `ImageQuestionPreview.tsx` - Image trivia preview
- `VideoQuestionPreview.tsx` - Video trivia preview with player
- `AudioQuestionPreview.tsx` - Audio trivia preview with waveform

### 4. `src/hooks/useQuestionStudio.ts`
Enhanced hook with:
- Production/Library filtering
- Question type filtering
- Multi-select state management
- Bulk operation handlers

---

## Preview Component Details

### iPhone Frame Wrapper (Shared)
Reuses the existing mockup frame pattern but enhanced:
```tsx
<div className="relative w-[320px] h-[640px] bg-black rounded-[50px] p-3">
  {/* Notch */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-black rounded-b-3xl z-10" />
  
  {/* Screen */}
  <div className="w-full h-full bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5] rounded-[40px] overflow-hidden">
    {/* Header with scores, power-ups */}
    {/* QuizQuestionCard with media */}
    {/* Answer buttons */}
  </div>
</div>
```

### Type-Specific Rendering
The preview panel dynamically shows:
- **Text**: Icon at top center, question text, 4 answer buttons
- **Image**: Image fills top section, short question below, answers
- **Video**: Video auto-plays muted in top section, question below
- **Audio**: Waveform player, play/pause button, question below

All using the **actual production components** (QuizQuestionCard, AudioPlayer) for pixel-perfect accuracy.

---

## Navigation in Admin Sidebar

Add new entry to `src/pages/Admin.tsx`:
```typescript
{ 
  to: '/admin/question-studio', 
  icon: Layers, // or similar
  label: 'Question Studio' 
}
```

---

## File Changes Summary

| Type | Path | Description |
|------|------|-------------|
| NEW | `src/pages/admin/QuestionStudio.tsx` | Main studio page |
| NEW | `src/components/admin/studio/StudioTabs.tsx` | Tab navigation |
| NEW | `src/components/admin/studio/CategorySidebar.tsx` | Category filter panel |
| NEW | `src/components/admin/studio/QuestionList.tsx` | Question list with selection |
| NEW | `src/components/admin/studio/QuestionFilters.tsx` | Advanced filters |
| NEW | `src/components/admin/studio/QuestionPreviewPanel.tsx` | Live preview with navigation |
| NEW | `src/components/admin/studio/BulkActionsBar.tsx` | Bulk operations toolbar |
| NEW | `src/hooks/useQuestionStudio.ts` | Enhanced data hook |
| EDIT | `src/hooks/useAdminQuestions.ts` | Add media fields, production filter |
| EDIT | `src/pages/Admin.tsx` | Add route to sidebar |
| EDIT | `src/App.tsx` | Add route |

---

## Technical Implementation Notes

1. **Live Preview Accuracy**: Use the actual `QuizQuestionCard` component (not a mockup replica) wrapped in a phone frame to guarantee 100% design fidelity

2. **Bulk Operations**: Use Supabase batch updates with array of IDs for performance

3. **Selection State**: Track selected IDs in a Set for O(1) operations

4. **Question Type Detection**: Helper function:
   ```typescript
   function getQuestionType(q: AdminQuestion): 'text' | 'image' | 'video' | 'audio' {
     if (q.video_url) return 'video';
     if (q.audio_url) return 'audio';
     if (q.image_url) return 'image';
     return 'text';
   }
   ```

5. **Keyboard Navigation**: Arrow keys to navigate questions, Enter to edit, Space to toggle selection

6. **Real-time Updates**: Subscribe to questions table changes for live sync across admin sessions
