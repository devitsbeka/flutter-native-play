
# Fix: Preserve User-Entered Room Name When Changing Icons

## Problem

In the `RoomIconPickerModal`, when the user:
1. Manually edits the room name in the input field
2. Then clicks on a new icon

The system **always** regenerates the name with AI, overwriting the user's custom name. This is frustrating because the user's input is lost.

## Root Cause

The `handleIconClick` function on line 283-287 unconditionally calls `generateNameForIcon()`:

```typescript
const handleIconClick = async (icon: IconItem) => {
  setSelectedIcon(icon.icon_url);
  addRecentIcon(icon.slug);
  await generateNameForIcon(icon.slug);  // ← ALWAYS overwrites name!
};
```

## Solution

Track whether the user has manually modified the name, and only regenerate the name if they haven't:

1. Add a `hasManuallyEditedName` ref to track if user typed in the name field
2. Set it to `true` when user types in the input
3. Only call `generateNameForIcon()` if `hasManuallyEditedName` is `false`
4. Reset the flag when the modal opens

---

## Implementation

### Changes to `src/components/team/RoomIconPickerModal.tsx`

**1. Add a ref to track manual edits (after line 79)**

```typescript
const hasManuallyEditedName = useRef(false);
```

**2. Update the name input onChange handler (line 368)**

Mark that the user has manually edited when they type:

```typescript
onChange={(e) => {
  setEditableName(e.target.value);
  hasManuallyEditedName.current = true;
}}
```

**3. Update `handleIconClick` to check before generating (lines 283-287)**

Only regenerate name if user hasn't manually edited:

```typescript
const handleIconClick = async (icon: IconItem) => {
  setSelectedIcon(icon.icon_url);
  addRecentIcon(icon.slug);
  
  // Only auto-generate name if user hasn't manually edited it
  if (!hasManuallyEditedName.current) {
    await generateNameForIcon(icon.slug);
  }
};
```

**4. Reset the flag when modal opens (inside the useEffect at lines 241-252)**

```typescript
useEffect(() => {
  if (isOpen) {
    fetchRandomIcons();
    loadRecentIcons();
    fetchCategoryIcons(null);
    setSelectedIcon(currentIconUrl);
    setEditableName(roomName);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedCategory("all");
    hasManuallyEditedName.current = false;  // Reset on open
  }
}, [isOpen, ...]);
```

---

## User Experience After Fix

| Scenario | Behavior |
|----------|----------|
| User opens modal and clicks icon | AI generates new name ✓ |
| User types custom name, then clicks icon | Custom name preserved ✓ |
| User opens modal fresh | Name tracking resets ✓ |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/RoomIconPickerModal.tsx` | Add `hasManuallyEditedName` ref, update `onChange`, conditional name generation, reset on modal open |
