

## Fix: Question Shortener Showing 0 When Long Questions Exist

### Root Cause

The shortener is actually working correctly for the selected category ("მსოფლიო ისტორია"). The database confirms all 12 long English questions in that category are already marked `unshortenable` -- meaning the AI previously tried to shorten them but couldn't get them under the 67-character limit. They correctly don't appear as "needs shortening."

However, there are **three real problems**:

1. **Invisible "unshortenable" questions**: 251 long English production questions are marked `unshortenable` but this count appears nowhere in the UI. They vanish from the stats, making it seem like nothing needs work.

2. **No way to retry**: Once marked `unshortenable`, these questions can never be re-processed. There's no reset/retry option.

3. **2,018 questions DO need shortening across other categories**: When selecting "All Categories" + English + In Prod, the shortener should show 2,018 questions needing work. The specific category shown in the screenshot genuinely has 0, but 38 other categories have pending work.

### Data Summary (English, In Production)

| Status | Count |
|--------|-------|
| Need shortening (null status, text > 67 chars) | 2,018 |
| Marked unshortenable (still long) | 251 |
| Already shortened (still long after shortening) | 736 |
| Pending review | 90 |
| Needs rewrite | 23 |

### Fix Plan

#### 1. Add "Unshortenable" stat to the UI (`CombinedShortener.tsx`)

Add a new counter in the stats grid showing how many questions are marked `unshortenable`. This makes the invisible questions visible and lets the user understand where their long questions went.

#### 2. Add "Reset Unshortenable" button

Add a button that resets `shorten_status` from `unshortenable` to `NULL` for questions matching the current filters (category, language, production status). This allows re-processing with potentially better AI prompts.

#### 3. Default `inProduction` to `true`

Change the initial state from `false` to `true` since the user always works with production questions. This avoids the confusing step of switching to "In Prod" every time.

#### 4. Count `unshortenable` in `loadStats`

Update the stats calculation to track `unshortenable` as a separate counter:

```text
const unshortenable = targetQuestions.filter(q =>
  (q.shorten_status === 'unshortenable' && q.question_text.length > MAX_QUESTION_LENGTH) ||
  (q.answer_shorten_status === 'unshortenable')
);
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/CombinedShortener.tsx` | Add unshortenable stat + reset button, default to In Prod, update stats interface |

### Result

- User sees exactly where long questions are: needs work, unshortenable, pending, processed
- "Reset" button allows retrying unshortenable questions
- Selecting "All Categories" + English + In Prod shows the real 2,018 count
- Default opens in "In Prod" mode matching the user's workflow

