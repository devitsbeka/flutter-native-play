
## Fix: Icon Clickability and Search Results

### Problem 1: Icon not clickable in EditQuizModal question cards
The fixed header has `z-[110]` and sits on top of the question card content. Although the content has `pt-[100px]`, the QuestionIconPicker's trigger button only has `z-10`, so the header captures click events before they reach the icon button. The icon only becomes accessible through the EditQuestionDialog because that dialog renders as a separate full-screen overlay.

**Fix in `src/components/social/EditQuizModal.tsx`:**
- Use a portal-based approach (like PersonalTriviaModal and GameStylePersonalTrivia already do) for the QuestionIconPicker in question cards
- Instead of relying on the inline trigger button, add a dedicated "tap to change icon" button that opens the icon picker via `createPortal` outside the carousel stacking context
- Track `iconPickerIndex` state (which question's icon is being edited)
- Render `QuestionIconPicker` with `isOpen`/`onClose` props via `createPortal(...)` at the document body level, avoiding all z-index conflicts

### Problem 2: Searching "khinkali" doesn't find the khinkali icon
The search for "khinkali" generates 36+ search terms due to fuzzy matching (e.g., "food", "meat", "bird", "apple", "goat", "pig", "carnival", etc.). The DB query fetches 100 results across ALL these broad terms, and the khinkali icon gets lost because generic terms like "food" and "meat" match hundreds of icons.

**Fix in `supabase/functions/smart-icon-search/index.ts`:**
- Add a separate "exact slug/title match" query that runs first with the original query term
- Ensure exact matches always appear at the top regardless of how many fuzzy terms are generated
- Specifically: before the main search, run `supabase.from('icon_library').select(...).or('slug.ilike.%${query}%,title.ilike.%${query}%')` and prepend those results with maximum score
- This ensures that typing "khinkali" always returns the khinkali icon first, while still showing related results

### Technical Details

**EditQuizModal.tsx changes:**
- Import `createPortal` from `react-dom`
- Add `iconPickerIndex` state (`number | null`)
- Change the icon area in each question card to a simple button that sets `iconPickerIndex = index`
- Render `QuestionIconPicker` via `createPortal` with `isOpen={iconPickerIndex !== null}` and `onClose={() => setIconPickerIndex(null)}` at the end of the component, outside all carousel/header stacking contexts
- Pass the current question's data (text, correct answer, incorrect answers, selected slug) to the portal-rendered picker

**smart-icon-search/index.ts changes:**
- Before the main scored search, run a direct query: `slug.eq.${queryLower}` or `slug.ilike.%${queryLower}%,title.ilike.%${queryLower}%`
- Merge these "priority" results into the final array with a boosted score (e.g., +200) so they always rank first
- Deduplicate by icon id before returning
