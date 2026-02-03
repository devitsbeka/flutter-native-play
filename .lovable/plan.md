
# Plan: Direct Category Picker Flow and Consistent Icons

## Overview

When the host clicks "გაგრძელება" (Continue) on the results screen, show the category picker directly instead of going to the lobby first. Non-host players should see "ველოდებით ჰოსტს" instead of the continue button. Also ensure question icons are consistent across all players.

---

## Current Behavior

1. **Results Screen (`GameResultsScreenV2.tsx`)**:
   - When there's a queue: Host clicks "გაგრძელება" → starts next queued game
   - When queue is empty: Host clicks "კატეგორიის დამატება" → goes to lobby → opens picker
   - Non-host sees "ველოდებით მასპინძელს..." when queue is empty ✅ (already correct)
   - Non-host can also click "გაგრძელება" when queue has items ❌ (should not be able to)

2. **Icon Consistency Issue**:
   - Host stores `icon_slug` in `room_questions` table when seeding questions
   - Non-hosts fetch `icon_slug` from `room_questions` and pass to `DynamicIcon`
   - `DynamicIcon` uses `hideIfEmpty={true}` to hide when no icon assigned
   - Issue: If `icon_slug` is missing, `DynamicIcon` falls back to `getRandomIconForCategory` with a `stableSeed` based on `questionId` - but the `questionId` differs between host and guests!

---

## Technical Solution

### Part 1: Direct Category Picker from Results Screen

**File: `src/components/team/GameResultsScreenV2.tsx`**

1. Add state for showing the category picker modal directly in results screen
2. Import `CategoryPickerModal` component
3. When host clicks "გაგრძელება" (continue) with queue:
   - Keep current behavior (auto-start next queue item)
4. When host clicks "კატეგორიის დამატება" (no queue):
   - Instead of `continueInRoom()` which goes to lobby → Open `CategoryPickerModal` directly
5. When non-host sees queue has items:
   - Show "ველოდებით ჰოსტს" instead of clickable button
6. Add handlers for category selection that update room and start game

**Changes Summary**:
```text
- Import CategoryPickerModal, handlers from RoomLobbyV2 pattern
- Add state: showCategoryPicker, startAfterPick
- Add handlers: handleSelectCategory, handleSelectRandom, handleSelectTrivia
- Modify button logic:
  - Host with queue → "გაგრძელება" (starts next)
  - Host without queue → "აირჩიე კატეგორია" → opens picker
  - Non-host → "ველოდებით ჰოსტს" (always waiting)
- After category selection: start game directly without going to lobby
```

### Part 2: Consistent Icons Across All Players

**Issue Analysis**:
The `questionId` used for seeding random fallback icons differs:
- Host creates questions with `id: q.id` (actual database ID)
- Guests receive questions with `id: ${roomId}-${question_index}` (synthetic ID)

**Solution 1: Store deterministic seed in database**

**File: `src/contexts/MultiplayerContextV2.tsx`**

When inserting questions to `room_questions`, generate and store a stable seed value that will be used by all clients for icon fallback:

```typescript
// When inserting questions
const iconSeed = hashCode(q.question + q.correctAnswer); // Deterministic from content
supabase.from("room_questions").insert({
  ...
  icon_seed: iconSeed, // New column
});
```

**Alternative Solution 2 (Simpler): Use question_text as seed source**

Since the question text is identical across all clients, we can use it as the seed source without adding a database column.

**File: `src/components/shared/DynamicIcon.tsx`**

Add a new prop `seedText` that takes precedence over `questionId` for generating the stable seed:

```typescript
interface DynamicIconProps {
  ...
  seedText?: string; // Use question text for deterministic seeding
}

const stableSeed = React.useMemo(() => {
  // Priority: seedText → questionId → slug → categoryId
  const seedSource = seedText || questionId || slug || categoryId || '';
  return seedSource ? hashString(seedSource) : 0;
}, [seedText, questionId, slug, categoryId]);
```

**File: `src/components/team/MultiplayerGameScreenV2.tsx`**

Pass question text as the seed:

```tsx
<DynamicIcon 
  slug={currentQuestion?.iconSlug}
  seedText={currentQuestion?.question} // Ensures same seed for all players
  categoryId={...}
  size={112}
  hideIfEmpty={true}
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/GameResultsScreenV2.tsx` | Add CategoryPickerModal, modify button logic for host/non-host |
| `src/components/shared/DynamicIcon.tsx` | Add `seedText` prop for deterministic icon fallback |
| `src/components/team/MultiplayerGameScreenV2.tsx` | Pass `seedText={currentQuestion?.question}` to DynamicIcon |

---

## Detailed Button Logic After Changes

### Results Screen Button Matrix

| Player | Queue Status | Button Text | Action |
|--------|-------------|-------------|--------|
| Host | Has items | გაგრძელება | Start next from queue |
| Host | Empty | აირჩიე კატეგორია | Open picker modal |
| Non-Host | Has items | ველოდებით ჰოსტს | No action (waiting) |
| Non-Host | Empty | ველოდებით ჰოსტს | No action (waiting) |

### Category Picker Flow (Host Only)

```text
1. Host clicks "აირჩიე კატეგორია"
2. CategoryPickerModal opens (main view shows: შემთხვევითი, ბიბლიოთეკა, ჩემი ტრივიები)
3. Host selects category/trivia
4. Room is updated with new selection
5. Game starts immediately (skip lobby)
6. All players transition to playing phase
```

---

## Testing Checklist

1. Host finishes round with queue items:
   - Clicks "გაგრძელება" → next game starts
2. Host finishes round with empty queue:
   - Clicks "აირჩიე კატეგორია" → picker opens (NOT lobby)
   - Selects category → game starts immediately
3. Non-host always sees "ველოდებით ჰოსტს" on results screen
4. Icons are identical on all devices for the same question
5. No icon flicker or mismatch between host and guests

