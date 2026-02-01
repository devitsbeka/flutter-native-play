

## Fix Icon Display and True/False Button Height

### Problem 1: Icons Showing Incorrectly

The trivia icons appear irrelevant (e.g., checkbook icon for a cooking question) because of a **field name mismatch**.

**Root Cause:**
- The database stores icons as `iconSlug` (camelCase)
- The conversion functions only check for `icon_slug` (snake_case)
- Result: The `icon_slug` field is always `null`, and the system falls back to random icons

**Evidence from database:**
```json
{
  "question_text": "ჩაქაფული მზადდება ძირითადად ღორის ხორცით.",
  "iconSlug": "split-pea-soup"  // <-- camelCase in database
}
```

But the conversion code only checks:
```typescript
icon_slug: q.icon_slug || null  // Only checks snake_case - MISSING camelCase!
```

---

### Problem 2: True/False Cards Too Tall

The True/False answer buttons are `130px` tall, taking up too much screen space.

**Fix:** Reduce height by 30%: `130 × 0.7 = 91px` → rounded to `90px`

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/TriviaLobby.tsx` | Add `q.iconSlug` fallback to conversion function (line 82) |
| `src/components/social/MyTriviaTab.tsx` | Add `q.iconSlug` fallback to conversion function (line 71) |
| `src/hooks/usePlayerFeedItems.ts` | Add `q.iconSlug` fallback to conversion (line 175) |
| `src/components/ui/quiz-true-false-button.tsx` | Change height from `h-[130px]` to `h-[90px]` (line 119) |

---

### Technical Details

**Fix 1: Icon Slug Field Name (3 files)**

Change:
```typescript
icon_slug: q.icon_slug || null,
```

To:
```typescript
icon_slug: q.icon_slug || q.iconSlug || null,
```

This ensures both naming conventions are supported.

**Fix 2: True/False Button Height**

Change:
```typescript
className={cn(
  "w-full relative cursor-pointer h-[130px]",
  ...
)}
```

To:
```typescript
className={cn(
  "w-full relative cursor-pointer h-[90px]",
  ...
)}
```

---

### Expected Outcome

- Icons will correctly display the assigned icon (e.g., cooking-related icons for food questions)
- True/False buttons will be 30% smaller, improving visibility of the question area
- Both changes are backward-compatible with existing data

