
# Add "Spoiler-Free" Indicator to Trivia Picker

## Problem

When selecting trivia to play with friends, users cannot distinguish between:
- **Trivias they can play** (created in "სათამაშოდ" mode - answers were hidden during creation)
- **Trivias they edited** (created in "რედაქტირებით" mode - user saw all answers)

Currently all trivias look identical in the picker, making it hard to know which ones the user can enjoy playing themselves.

---

## Solution Overview

Add a new `is_blind` column to track trivia creation mode, then display visual indicators in the picker to help users identify which trivias are spoiler-free.

---

## Implementation Steps

### 1. Database Migration

Add a new boolean column `is_blind` to `user_quiz_posts`:

```sql
ALTER TABLE user_quiz_posts 
ADD COLUMN is_blind BOOLEAN NOT NULL DEFAULT false;
```

- `is_blind = true` → Created in play mode (creator never saw answers)
- `is_blind = false` → Created in edit mode (creator saw/edited answers)

### 2. Update Creation Modals

When saving trivia in "play mode", set `is_blind: true`:

**Files to update:**
- `src/components/team/CreateBlindTriviaModal.tsx`
- `src/components/social/CreateQuizModal.tsx`
- `src/components/social/CreateCollectionModal.tsx`

For play mode saves, add:
```typescript
is_blind: creatorMode === "play"
```

### 3. Update Query Interfaces

Add `is_blind` to the Trivia interface and queries:

**Files to update:**
- `src/components/team/MyTriviasPickerModal.tsx`
- `src/components/controller/ControllerDirectSelection.tsx`
- `src/components/challenge/MyTriviasPicker.tsx`

Update queries to select `is_blind`:
```typescript
.select("id, title, cover_image, plays_count, likes_count, is_public, is_blind, subject")
```

### 4. Add Visual Indicators

Display badges/indicators in the trivia picker lists:

| `is_blind` Value | Indicator | Meaning |
|------------------|-----------|---------|
| `true` | 🎮 Green badge "ითამაშე" | You can play this - answers hidden |
| `false` | 👀 Grey text "იცი პასუხები" | You know the answers - for friends only |

**UI Implementation:**

For spoiler-free (playable) trivias:
```tsx
{trivia.is_blind && (
  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-medium">
    🎮 ითამაშე
  </span>
)}
```

For trivias where user knows answers:
```tsx
{!trivia.is_blind && (
  <span className="text-xs text-muted-foreground">
    👀 იცი პასუხები
  </span>
)}
```

---

## Technical Details

### MyTriviasPickerModal.tsx Changes

Update the interface:
```typescript
interface Trivia {
  id: string;
  title: string;
  cover_image: string | null;
  plays_count: number;
  likes_count: number;
  is_public: boolean;
  is_blind: boolean;  // NEW
  subject?: string;
}
```

Update the query:
```typescript
.select("id, title, cover_image, plays_count, likes_count, is_public, is_blind, subject")
```

Update the trivia list item rendering to include the indicator below the title/stats.

### ControllerDirectSelection.tsx Changes

Similar updates - add `is_blind` to the UserTrivia interface and query, then update the display.

Currently shows `⚠️ გამოტოვებ` for all user trivias - this should become conditional:
- If `is_blind = true`: Remove the warning (user CAN play)
- If `is_blind = false`: Keep showing "გამოტოვებ" warning

---

## Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add `is_blind` column |
| `src/components/team/CreateBlindTriviaModal.tsx` | Set `is_blind: true` for play mode |
| `src/components/social/CreateQuizModal.tsx` | Set `is_blind: creatorMode === "play"` |
| `src/components/social/CreateCollectionModal.tsx` | Set `is_blind: creatorMode === "play"` |
| `src/components/team/MyTriviasPickerModal.tsx` | Add `is_blind` to query & interface, show indicator |
| `src/components/controller/ControllerDirectSelection.tsx` | Add `is_blind`, conditional skip warning |
| `src/components/challenge/MyTriviasPicker.tsx` | Add `is_blind` to query & interface, show indicator |

---

## Result

After implementation:
- Users see at a glance which trivias they can play (🎮 green badge)
- Users know which trivias they've already seen answers for (👀 grey text)
- In ControllerDirectSelection, the "გამოტოვებ" warning only appears for non-blind trivias
- New trivias created in play mode will correctly track this for future reference
