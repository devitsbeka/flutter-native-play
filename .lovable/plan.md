

## Add "Mark as Fixed" Button to Shortener Results

### What changes
Each result card in the CombinedShortener that shows "შემოკლებადი" (unshortenable) or has a "still too long" warning will get a new **"Fixed"** button. When clicked:

1. The card background turns **green** (same styling as successfully shortened items)
2. The badge changes to a green "Fixed" state
3. The question is marked as acceptable in the database (`shorten_status = 'manual_ok'` or similar) so it won't keep showing up as problematic

### Technical Details

**File: `src/components/admin/CombinedShortener.tsx`**

1. **Add local state** to track manually approved question IDs:
   ```typescript
   const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
   ```

2. **Add `markAsFixed` handler** that:
   - Updates the question in DB: sets `shorten_status = 'manual_ok'` so it's excluded from future shortening runs
   - Adds the ID to `approvedIds` set
   - Shows a success toast

3. **Update card styling** (lines ~716-723): Check if `approvedIds.has(result.id)` -- if so, use the green border/bg styling regardless of `overallStatus`

4. **Update badge** (lines ~728-738): If approved, show a green "Fixed" badge with checkmark icon

5. **Add "Fixed" button** next to the edit/delete buttons (lines ~740-754): A green-tinted button with a `CheckCircle` icon. Hidden once already approved. Visible for cards that are `unshortenable`, `failed`, or have `newQuestionLength > MAX_QUESTION_LENGTH`

6. **Update stats reload** after marking as fixed so counts refresh

This is purely a UI + single DB field update per question -- no AI calls, no edge functions needed.

