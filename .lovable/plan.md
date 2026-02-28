

## Fix Question Repetition (Especially Image Questions)

### Problem
Users see repeated questions — especially image-based ones — despite having 9,000+ questions available. Root causes:

1. **Exclude list capped at 200 IDs**: After playing 200+ questions, old question IDs drop off the exclusion list, allowing repeats
2. **No media-type awareness**: 295 image questions mixed into 9,060 total means image questions cycle much faster (3% of pool)
3. **Multi-category VS mode fetches only 1,000 rows**: 89% of questions are never even considered for selection
4. **Global seen tracker stores 5,000 IDs** but only 200 are sent in the query exclusion — wasting the tracking data

### Solution

#### 1. Smarter Exclude Strategy in `questionService.ts`
Instead of sending 200 IDs in a `NOT IN` clause (URL length limited), switch to a **server-side exclusion approach**:
- Fetch a larger pool (no exclude filter in the query)
- Apply exclusion **client-side** against the full seen list (up to 5,000 IDs)
- This completely eliminates the 200-ID cap bottleneck

For all modes (Category, VS Single, VS Multi, TV):
- Remove `NOT IN` query filters
- Fetch full pool (or larger limit)
- Filter out seen IDs in JavaScript using a `Set` for O(1) lookups

#### 2. Media-Aware Selection in Multi-Category VS Mode
Add a **media-first reservation step** to `getMultiCategoryVSQuestions`:
- Separate fetched questions into `mediaQuestions` (has image/video/audio) and `textQuestions`
- Reserve 1-2 slots for unseen media questions (if available)
- Fill remaining slots with the existing round-robin category diversity logic
- This ensures image questions appear regularly but don't repeat

#### 3. Increase Fetch Limits
- Multi-category VS: Remove `.limit(1000)` or raise significantly — fetch the full pool and filter client-side
- Category mode: Already fetches `.limit(50)` which is fine for per-category

#### 4. Media-Specific Seen Tracking in `questionTracker.ts`
Add a lightweight **media seen tracker** alongside the existing global seen:
- New `mediaSeen: string[]` array in `TrackerData`
- `markMediaQuestionsSeen()` and `getMediaSeenIds()` functions
- Cap at 500 IDs (295 image questions exist, so this covers the full pool)
- When all media questions are seen, reset only media tracker (not global)

### Files to Change

| File | Change |
|------|--------|
| `src/services/questionService.ts` | Client-side exclusion filtering for all modes; media-aware slot reservation in VS multi-category; remove `.limit(1000)` cap |
| `src/services/questionTracker.ts` | Add `mediaSeen` tracking array with mark/get/clear/reset functions |

### Technical Details

**Client-side exclusion approach** (replacing NOT IN query):
```text
Before: query.not('id', 'in', `(${excludeIds.slice(-200).join(',')})`) -> fetches 1000 rows
After:  query (no filter) -> fetches all -> Set-based filter against 5000 seen IDs in JS
```

**Media reservation in VS multi-category**:
```text
1. Split valid questions into media[] and text[]
2. Pick 1-2 unseen media questions (if any exist)
3. Fill remaining count with round-robin from text+media combined
4. Mark media questions in mediaSeen tracker
```

**Performance**: Fetching 9,000 rows of question data (id + text + answers) is ~2-3MB — acceptable for a one-time game start fetch. The client-side Set filtering is O(n) and near-instant.

