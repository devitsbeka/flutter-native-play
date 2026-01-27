

# Fix Trivia Creation UI - Text and Layout Changes

## Overview
The user wants several changes to the trivia creation modals:
1. Change "დააგენერირე" to "შექმნა" for the generate button
2. Move "დაამატე რაუნდი" button above the "შექმნა" button 
3. Remove the background container from the AI info text
4. Show different AI text based on context:
   - Single trivia: "AI დააგენერირებს 5 კითხვას"
   - Collection (multiple rounds): "AI დააგენერირებს 5 კითხვას თითოეულ რაუნდზე"

---

## Changes

### 1. CreateBlindTriviaModal.tsx

**File:** `src/components/team/CreateBlindTriviaModal.tsx`

#### a) Move "დაამატე რაუნდი" from Step 2 to Step 3 (above generate button)

**Current location (lines 434-446):** Inside step 2 content
**New location:** Inside step 3 content (after answer format selection, before the generation progress)

Move the button block and add the AI info text:

```tsx
// After the answer format grid (line 532), before isGenerating check:

{/* Add round button - switch to collection mode */}
{onSwitchToCollection && !isGenerating && (
  <button
    onClick={() => {
      onOpenChange(false);
      onSwitchToCollection(subject);
    }}
    className="w-full py-3 rounded-xl bg-white/20 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
  >
    <Plus className="w-5 h-5" />
    დაამატე რაუნდი
  </button>
)}

{/* AI info text - no background container */}
{!isGenerating && (
  <p className="text-sm text-white/80 text-center">
    ✨ AI დააგენერირებს <span className="font-bold">{questionCount} კითხვას</span>
  </p>
)}
```

**Remove from lines 434-446** (step 2)

#### b) Change button text from "შექმენი" to "შექმნა"

**Line 616:** Change `შექმენი` to `შექმნა`

---

### 2. CreateCollectionModal.tsx

**File:** `src/components/social/CreateCollectionModal.tsx`

#### a) Remove background container from AI info text

**Lines 1021-1025 - Current:**
```tsx
<div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm text-center">
  <p className="text-sm text-white/80">
    ✨ AI დაგენერირებს <span className="font-bold">{DEFAULT_QUESTIONS_PER_ROUND} კითხვას</span> თითოეულ რაუნდზე
  </p>
</div>
```

**Updated - just the text, no container:**
```tsx
<p className="text-sm text-white/80 text-center">
  ✨ AI დააგენერირებს <span className="font-bold">{DEFAULT_QUESTIONS_PER_ROUND} კითხვას</span> თითოეულ რაუნდზე
</p>
```

Note: Also fixing the verb from "დაგენერირებს" to "დააგენერირებს" (prefixed form)

#### b) Change button text from "დაგენერირება" to "შექმნა"

**Line 1035:** Change `დაგენერირება` to `შექმნა`

#### c) Reorder: Move "დაამატე რაუნდი" button AFTER the info text (so it's above the "შექმნა" button)

**Current order (lines 1010-1037):**
1. Add round button
2. Info text
3. Generate button

**New order:**
1. Info text (no container)
2. Add round button  
3. Generate button

---

## File Changes Summary

| File | Lines | Change |
|------|-------|--------|
| `src/components/team/CreateBlindTriviaModal.tsx` | 434-446 | Remove "დაამატე რაუნდი" button from step 2 |
| `src/components/team/CreateBlindTriviaModal.tsx` | ~532 | Add "დაამატე რაუნდი" button + AI info text after answer format in step 3 |
| `src/components/team/CreateBlindTriviaModal.tsx` | 616 | Change "შექმენი" → "შექმნა" |
| `src/components/social/CreateCollectionModal.tsx` | 1021-1025 | Remove container, just show text (with "თითოეულ რაუნდზე") |
| `src/components/social/CreateCollectionModal.tsx` | 1010-1025 | Reorder: info text first, then add round button |
| `src/components/social/CreateCollectionModal.tsx` | 1035 | Change "დაგენერირება" → "შექმნა" |

---

## Result

After these changes:
- Button text will be "შექმნა" in both modals
- "დაამატე რაუნდი" will appear directly above the "შექმნა" button
- AI info text will have no background container
- Single trivia shows: "AI დააგენერირებს 5 კითხვას"
- Collection shows: "AI დააგენერირებს 5 კითხვას თითოეულ რაუნდზე"

