
# Plan: Fix Mascot Video Display in Avatar Circle

## Problem Identified

When a user has no avatar set, the mascot video should play inside the circular avatar area on the main page. There's a CSS positioning bug preventing this from working correctly.

**Root Cause:** In `AvatarCircle.tsx`, the container for the mascot video (lines 298-303) has `overflow-hidden` and `rounded-full` but is **missing `position: relative`**. Since `SinglePlayVideo` uses `absolute inset-0` positioning for both its wrapper and the video element, the video doesn't position correctly within its intended circular container.

---

## Visual Issue

**Current behavior:**
- The mascot video may appear misaligned, escape the circle bounds, or not show at all
- The circular container exists but the absolute-positioned video inside doesn't respect it

**Expected behavior:**
- Mascot video plays centered inside the circular avatar area
- Video is properly clipped by the rounded-full overflow-hidden container

---

## Technical Fix

### File: `src/components/home/AvatarCircle.tsx`

**Line 299** - Add `relative` class to the mascot video container:

```typescript
// Before (line 299):
className="rounded-full overflow-hidden"

// After:
className="rounded-full overflow-hidden relative"
```

This single change ensures the absolutely-positioned `SinglePlayVideo` content stays within the circular container bounds.

---

## Summary

| File | Change |
|------|--------|
| `src/components/home/AvatarCircle.tsx` | Add `relative` class to mascot video container (line 299) |

This is a minimal one-line fix that enables the mascot video to display properly within the circular avatar area for users who haven't set an avatar yet.
