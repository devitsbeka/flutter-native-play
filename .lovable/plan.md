
# Plan: Fix Avatar Display, Mixed Category Icon & Queue Preview Location

## Issues to Fix

### Issue 1: Broken Friend Avatars in CreateRoomPage
**File:** `src/components/team/CreateRoomPage.tsx`

The friend avatars show question marks because the code uses `friend.avatarUrl` directly without resolving preset avatar paths:

```tsx
// Current (line 924)
src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.friendId}`}
```

**Fix:** Import and use `resolveAvatarUrl` to handle preset avatars stored as `/src/assets/avatars/...` paths.

---

### Issue 2: "სხვადასხვა" (Mixed) Category Shows Empty Card
**File:** `src/components/team/CreateRoomPage.tsx`

When the user selects "სხვადასხვა" from the library, the preview card displays an empty purple gradient without the mystery-box icon. The library preview section (around line 1119-1132) doesn't check for `category_id === "__mixed__"`.

**Fix:** Add special handling for the mixed category:
- When `selectedCategory.id === "__mixed__"`, show the mystery-box `DynamicIcon` inside the card instead of the default gradient background
- Add a gradient background similar to the picker (purple to pink)

---

### Issue 3: Queue Preview Location & Format
**Current state:** The `PreRoomQueuePreview` component is rendered at line 1280, after the category options section (at the bottom).

**User wants:** Show the queue directly below the picked category card with format:  
`შემდეგი რაუნდები: 1. მეცნიერება 2. სპორტი etc...`

**Fix:** 
1. Move the queue preview inside each category preview card (random, library, my-trivias)
2. Change the format from horizontal pills to a compact inline text list
3. Display as: "შემდეგი რაუნდები: 1. {name} 2. {name} ..."

---

## Implementation Details

### File Changes

#### 1. `src/components/team/CreateRoomPage.tsx`

**Add import:**
```tsx
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
```

**Fix friend avatar (line ~924):**
```tsx
src={resolveAvatarUrl(friend.avatarUrl) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.friendId}`}
```

**Fix "სხვადასხვა" category preview (lines 1109-1165):**  
Add condition for mixed category to show mystery-box icon with gradient background instead of regular library preview.

**Move queue preview inside category cards:**  
Add inline queue display after category name in each expanded preview card:
```tsx
{queuedRounds.length > 0 && (
  <p className="text-xs text-white/80 mt-1">
    შემდეგი რაუნდები: {queuedRounds.map((r, i) => 
      `${i + 1}. ${r.category_name || "შემთხვევითი"}`
    ).join(" ")}
  </p>
)}
```

#### 2. Keep `PreRoomQueuePreview` at bottom but hide when category is selected
Or alternatively, remove it entirely and rely on the inline display.

---

## Summary

| Issue | File | Change |
|-------|------|--------|
| Friend avatars broken | `CreateRoomPage.tsx` | Add `resolveAvatarUrl()` call for avatar URLs |
| Mixed category empty card | `CreateRoomPage.tsx` | Add DynamicIcon + gradient for `__mixed__` category |
| Queue preview location | `CreateRoomPage.tsx` | Move queue list below category name in card, use inline text format |
