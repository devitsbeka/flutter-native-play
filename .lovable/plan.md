

## Add Language Filter to Icon Assignment Page

### What it does
Adds a language dropdown filter (English, Georgian, etc.) to the icon assignment page so you can work with questions from one language at a time when assigning icons.

### Changes

**1. Hook: `src/hooks/useAdminIconAssignment.ts`**
- Add `languageFilter` state (default: `null` = all languages)
- Add `language` to the SELECT query so we can display it
- Apply `.eq('language', languageFilter)` when a language is selected
- Include `languageFilter` in the filter change effect and pass it through `fetchQuestions`
- Add `language` field to `QuestionForAssignment` interface
- Apply language filter to stats counting as well
- Return `languageFilter` and `setLanguageFilter` from the hook

**2. Page UI: `src/pages/admin/IconAssignment.tsx`**
- Destructure `languageFilter` and `setLanguageFilter` from the hook
- Add a language Select dropdown next to the category filter (around line 782), with options:
  - All Languages (default)
  - English (en)
  - Georgian (ka)
  - French (fr)
  - German (de)
  - Spanish (es)
  - Italian (it)
  - Portuguese (pt)
- Show a small language badge on each question row so it's clear which language each question is in

### Technical Details

The language filter will be applied server-side in the Supabase query, so pagination and stats will correctly reflect only the selected language's questions. The supported language codes match the project's seven supported languages: `ka`, `en`, `fr`, `de`, `es`, `it`, `pt`.

