
# Plan: Fix Multiplayer Game Flow Issues & Room Name Generation

## Issues Identified

### Issue 1: Repetitive Room Names ("IQ პარტი")
The edge function uses AI to generate room names but the prompt is too restrictive, often returning the same result ("IQ პარტი"). The fallback list is also limited.

**Root Cause:** 
- AI prompt has limited style examples that repeat
- "IQ პარტი" is in both the fallback list and AI examples, causing high repetition
- Icon selection tied to keyword from name ("party" → party-popper icon)

### Issue 2: Game Flow Issues After First Round
Based on the database inspection, second round questions are not being properly persisted/fetched for non-host players. The issue occurs in the `startNewRound` or `startNextFromQueue` flow.

**Root Cause Analysis:**
1. When transitioning from results to the next round, the non-host player relies on realtime subscription to detect `status: "playing"`
2. The subscription handler then fetches `room_questions` and validates by `game_id`
3. **Bug:** There's a race condition where:
   - Host clears old questions and inserts new ones
   - Non-host subscription fires before new questions are inserted
   - Non-host gets empty/stale questions

**Evidence:** Database shows only first game's questions (`game_id: 2963a338...`) are persisted, while subsequent games (`8cf65e0d...`, `dd05ac4e...`) don't have matching room_questions entries.

---

## Technical Fixes

### Fix 1: Improve Room Name Diversity (Edge Function)

**File:** `supabase/functions/generate-room-name/index.ts`

**Changes:**
1. Expand fallback names list with 25+ unique options
2. Add randomization seed to AI prompt for variety  
3. Improve prompt to request more creative, unique names
4. Add error handling to retry once if same name generated twice

```typescript
// Expanded fallback list (replacing current 11 items with 25+)
const FALLBACK_NAMES = [
  // Battle themes
  "ტვინების არენა", "გონების რინგი", "IQ დუელი", "ჭიდაობა გონებით",
  // Team themes  
  "გენიოსთა კლუბი", "ჭკვიანთა ბანდა", "ნერდთა კლანი", "ტრიბა IQ",
  // Fun themes
  "IQ პარტი", "გონების რეივი", "ტვინის დისკო", "კვიზ ფესტი",
  // Epic themes
  "დრაკონთა კლუბი", "ნინჯა ტვინები", "ფენიქსის ბრძოლა", "ლომთა ბრძოლა",
  "მგლის ხრვა", "არწივის მზერა", "ვეფხვის გუნდი", "დათვის ბარი",
  // Victory themes
  "ჩემპიონთა რინგი", "მედლების კლუბი", "გამარჯვებულები", "თასის მეტოქენი",
  // Smart themes
  "ერუდიტების კლანი", "ინტელექტის ხიდი",
];

// Updated prompt with randomization
const randomSeed = Math.floor(Math.random() * 1000);
const prompt = `Generate a unique Georgian trivia room name (seed: ${randomSeed}).
...
IMPORTANT: Be creative and unique. Avoid common words like "IQ პარტი".
`;
```

### Fix 2: Fix Round Transition Race Condition

**File:** `src/contexts/MultiplayerContextV2.tsx`

**Problem:** When host starts a new round, non-host may fetch stale questions because:
1. Host deletes old questions
2. Subscription fires for room status change
3. Non-host fetches questions before host finishes inserting new ones

**Solution:** Add retry logic with exponential backoff and ensure questions are fully committed before room status changes.

**Changes to `startNewRound` and `startNextFromQueue`:**

1. **Ensure atomic operation order:**
   - First: Insert all new questions
   - Second: Wait for insertion confirmation
   - Third: Update room status to "playing"

2. **Improve non-host question fetching (subscription handler around line 322-415):**
   - Increase initial delay from 500ms to 800ms
   - Increase MAX_ATTEMPTS from 5 to 8
   - Increase RETRY_DELAY from 400ms to 600ms
   - Add logging to help debug future issues

```typescript
// In subscription handler for non-host:
await new Promise(resolve => setTimeout(resolve, 800)); // Increased from 500

let attempts = 0;
const MAX_ATTEMPTS = 8;  // Increased from 5
const RETRY_DELAY = 600; // Increased from 400

while (attempts < MAX_ATTEMPTS && !validQuestionsFound) {
  // ... existing validation logic ...
  
  if (!validQuestionsFound) {
    console.log(`[MP] Retry ${attempts + 1}/${MAX_ATTEMPTS}: waiting for questions...`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    attempts++;
  }
}
```

3. **Fix `startNewRound` function (lines 1206-1441):**
   - Ensure questions are inserted BEFORE room status update
   - Add small delay after question insertion to ensure DB commit

```typescript
// After inserting questions, add brief wait for DB commit
await Promise.all(questions.map((q, index) => 
  supabase.from("room_questions").insert({...})
));

// Small delay to ensure questions are committed before status change
await new Promise(resolve => setTimeout(resolve, 100));

// THEN update room status
await supabase
  .from("game_rooms")
  .update({ status: "playing", ... })
  .eq("id", roomId);
```

4. **Fix `startNextFromQueue` function (lines 1443-1730):**
   - Apply same atomic ordering fix
   - Add delay between question insertion and status update

---

## Files to Modify

1. **`supabase/functions/generate-room-name/index.ts`**
   - Expand FALLBACK_NAMES array (25+ unique names)
   - Add randomization seed to AI prompt
   - Improve prompt for more variety

2. **`src/contexts/MultiplayerContextV2.tsx`**
   - Increase retry delays in subscription handler (lines ~310-415)
   - Add delay between question insertion and status update in `startNewRound` (lines ~1270-1310)
   - Add delay between question insertion and status update in `startNextFromQueue` (lines ~1540-1700)

---

## Expected Behavior After Fix

### Room Names
- Each new room gets a unique, creative Georgian name
- Reduced repetition of "IQ პარტი" and similar common names
- Icons properly match the generated name themes

### Game Flow
- Non-host players reliably receive questions on round 2+
- No blank screens or missing questions during round transitions
- Proper synchronization between host and guests
