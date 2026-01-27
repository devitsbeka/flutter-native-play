

# Fix: Add Mode Selection to CreateBlindTriviaModal

## Problem

The mode selection step ("რედაქტირება" vs "თამაში") was added to `CreateQuizModal.tsx`, but when users click "ტრივია" in the type selection modal, it opens **`CreateBlindTriviaModal.tsx`** instead - which doesn't have the mode selection.

**Current Flow:**
```
CreateTriviaTypeModal → "ტრივია" clicked → CreateBlindTriviaModal opens → Step 1 = Topic Input (no mode selection!)
```

## Solution

Add the same mode selection step to `CreateBlindTriviaModal.tsx`, matching the pattern already implemented in `CreateQuizModal.tsx`.

---

## Changes to `src/components/team/CreateBlindTriviaModal.tsx`

### 1. Add imports and types

Add `Edit3` and `Users` icons from lucide-react:
```typescript
import { ChevronLeft, Sparkles, ChevronRight, Check, Loader2, RefreshCw, Globe, Lock, Edit3, Users } from "lucide-react";
```

Add creator mode type:
```typescript
type CreatorMode = "edit" | "play" | null;
```

### 2. Add creatorMode state

After the existing `step` state (line ~80):
```typescript
const [creatorMode, setCreatorMode] = useState<CreatorMode>(null);
```

### 3. Update resetForm

Add `setCreatorMode(null)` to the resetForm function:
```typescript
const resetForm = () => {
  setStep(1);
  setCreatorMode(null);  // ADD THIS
  setSubject("");
  // ... rest unchanged
};
```

### 4. Add mode selection handler

```typescript
const handleModeSelect = (mode: CreatorMode) => {
  setCreatorMode(mode);
  setStep(2);  // Proceed to topic input
};
```

### 5. Shift step numbers

| Current Step | New Step | Content |
|--------------|----------|---------|
| - | 1 (NEW) | Mode selection |
| 1 | 2 | Topic input |
| 2 | 3 | Count/difficulty/format |
| 3 | 4 | Generation loading |
| 4 | 5 | Editor (conditional) |

### 6. Add Step 1: Mode Selection UI

Insert new case in `renderStep()`:
```typescript
case 1:
  return (
    <motion.div>
      <div className="text-center">
        <img src={triviaBuzzer} alt="Create Trivia" className="w-16 h-16" />
        <h3 className="text-2xl font-bold text-white">როგორ გინდა შექმნა?</h3>
        <p className="text-white/70">აირჩიე შენთვის შესაფერისი გზა</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Edit Mode */}
        <button onClick={() => handleModeSelect("edit")}>
          <Edit3 />
          <h4>რედაქტირება</h4>
          <p>ნახე პასუხები, შეასწორე და გამოაქვეყნე</p>
        </button>
        
        {/* Play Mode */}
        <button onClick={() => handleModeSelect("play")}>
          <Users />
          <h4>თამაში</h4>
          <p>არ ნახო პასუხები, ითამაშე მეგობრებთან</p>
        </button>
      </div>
    </motion.div>
  );
```

### 7. Update existing step numbers

- Step 1 (Topic) → becomes Step 2
- Step 2 (Count/Difficulty) → becomes Step 3
- Step 3 (Loading) → becomes Step 4
- Step 4 (Editor) → becomes Step 5

### 8. Conditional Editor in Step 5

When `creatorMode === "play"`:
- Show question count but hide actual content
- Show title editing
- Replace "მზადაა!" with "შეინახე და დაიწყე თამაში"
- Set `is_public: false` when saving

```typescript
// In step 5 (editor step)
if (creatorMode === "play") {
  return (
    <motion.div>
      <CheckCircle className="text-green-400" />
      <h3>{editorQuestions.length} კითხვა მზადაა!</h3>
      <p>პასუხები დამალულია</p>
      
      <Input 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="სათაური..."
      />
      
      <ChunkyButton onClick={handleStartGameBlind}>
        შეინახე და დაიწყე თამაში
      </ChunkyButton>
    </motion.div>
  );
}
// else: show normal editor UI
```

### 9. Update back button navigation

Adjust all back button handlers:
- Step 2: goes back to step 1
- Step 3: goes back to step 2
- etc.

### 10. Update renderBottomCTA

Adjust step numbers in the CTA rendering logic to match new step flow.

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/components/team/CreateBlindTriviaModal.tsx` | Add mode selection step, shift all steps by +1, add conditional play mode editor view |

## Result

After this fix:
- User clicks "ტრივია" → sees mode selection ("რედაქტირება" vs "თამაში")
- **Edit mode**: Full question editing flow (current behavior)
- **Play mode**: Hidden answers, quick save, ready to play with friends without spoilers

