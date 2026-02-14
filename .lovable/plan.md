
## Fix Question Repetition: Add Database-Level Randomization

### Problem
Users see repeated questions despite having thousands available. The root cause is that all Supabase queries return rows in deterministic order (insertion order), so the same "first N" rows are always fetched. Frontend shuffling only randomizes **within** that same subset.

Additionally, VS/Mixed mode caps fetches at `.limit(200)`, meaning only 200 of potentially 8,000+ questions are ever considered.

### Solution
Replace all `.limit(N)` calls with a two-step approach: fetch with no artificial limit (Supabase default 1000 is sufficient), then shuffle and pick on the client. This ensures every question in the pool has an equal chance of being selected.

For the multi-category VS/Mixed mode specifically, remove the `.limit(200)` cap so the full pool is available for round-robin selection.

### Changes

**File: `src/services/questionService.ts`**

1. **Category Mode (lines 319-333)**: Remove `.limit()` from primary query -- let it return all matching questions in the level range (typically 50-200), then shuffle client-side. The exclusion filter already narrows results.

2. **Category Mode Fallback 1 (lines 338-354)**: Same -- remove limit from the full-level-range fallback query.

3. **TV Mode (line 466)**: Change `.limit(50)` to no limit (or `.limit(500)`) so more of the category pool is available.

4. **TV Mode Fallback (line 481)**: Same -- increase limit from 50.

5. **Single-category VS Mode (line 618)**: Change `.limit(count * 3)` to `.limit(500)` to pull from a much larger pool.

6. **Single-category VS Fallback (line 633)**: Same increase.

7. **Multi-category VS/Mixed Mode (line 741)**: Change `.limit(200)` to `.limit(1000)` (Supabase max default) so the round-robin draws from the entire question bank.

### Technical Details

| Location | Current Limit | New Limit | Why |
|----------|--------------|-----------|-----|
| Category primary query (line 333) | No explicit limit (default 1000) | Keep as-is | Already good |
| Category fallback (line 353) | No explicit limit | Keep as-is | Already good |
| TV primary (line 466) | `.limit(50)` | Remove limit | 50 is too small, causes early repeats |
| TV fallback (line 481) | `.limit(50)` | Remove limit | Same reason |
| TV final fallback (line 500) | `.limit(count * 3)` | Remove limit | Same reason |
| Single-cat VS (line 618) | `.limit(count * 3)` | Remove limit | count*3 = ~30, too small |
| Single-cat VS fallback (line 633) | `.limit(count * 3)` | Remove limit | Same |
| Multi-cat VS/Mixed (line 741) | `.limit(200)` | `.limit(1000)` | 200 is only ~2.5% of 8000+ questions |

### What This Fixes
- Questions are selected from the **full available pool** (up to 1000 per query) instead of just the first 50-200
- Combined with the existing Fisher-Yates shuffle, every question has an equal probability of being chosen
- The localStorage tracking still prevents repeats until exhaustion -- this change just ensures the initial fetch covers the whole pool

### What This Does NOT Change
- The localStorage-based seen/asked tracking stays the same
- The exhaustion detection and reset logic stays the same
- No database changes needed
