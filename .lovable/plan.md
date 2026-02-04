
# Show Mystery-Box Icon in Blob Container for Mixed Category

## Problem

When the "სხვადასხვა" (Mixed) category is selected, the blob container shows a random category icon (like archaeology/medical equipment) instead of the mystery-box icon. The passed `iconUrl` prop with the mystery-box is being ignored.

## Root Cause

The `InteractiveBlobVideo` component receives `iconUrl` as a prop but never uses it. Instead:
- When spinning: Shows icons from slot sequence (`currentIconUrl`)
- When locked with video: Shows video
- When locked without video: Still shows `currentIconUrl` from slot sequence

The `iconUrl` prop (which contains mystery-box for mixed category) is completely ignored.

## Solution

Update `InteractiveBlobVideo` to use the passed `iconUrl` when the category is locked. This ensures the mystery-box icon appears in the blob container for the mixed category.

---

## Technical Changes

### File: `src/components/game/InteractiveBlobVideo.tsx`

**Update the locked state rendering logic (around lines 186-203):**

Change from showing `currentIconUrl` (slot sequence icon) to showing the passed `iconUrl` prop when locked:

```tsx
) : (
  <motion.div
    key={isLocked ? "locked-icon" : slotIndex}
    className="w-full h-full flex items-center justify-center"
    initial={{ y: -80, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 80, opacity: 0 }}
    transition={{ duration: 0.08, ease: "easeOut" }}
  >
    {/* When locked, show the passed iconUrl; when spinning, show slot icons */}
    {(isLocked ? iconUrl : currentIconUrl) && (
      <img 
        src={isLocked ? iconUrl : currentIconUrl} 
        alt="" 
        className="w-20 h-20 object-contain drop-shadow-lg"
      />
    )}
  </motion.div>
)}
```

**Key changes:**
1. Use `iconUrl` prop when `isLocked` is true
2. Use `currentIconUrl` (slot animation) when spinning
3. Update the key to `"locked-icon"` when locked to ensure proper animation state

---

## Visual Result

**Before:**
- Blob shows: Random category icon (archaeology, etc.)
- Title shows: "სხვადასხვა" with mystery-box above ✓

**After:**
- Blob shows: Mystery-box icon ✓
- Title shows: "სხვადასხვა" with mystery-box above ✓

Both the title area AND the blob container will show the mystery-box icon for the mixed category.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/game/InteractiveBlobVideo.tsx` | Use `iconUrl` prop when locked instead of slot sequence icon |
