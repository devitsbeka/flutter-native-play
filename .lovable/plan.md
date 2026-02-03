
# Plan: Update Profile Page UI to Match Reference Screen

## Overview
Redesign the Profile page tabs and layout to match the reference design (screen #4), replacing the current tab labels with "სტატისტიკა" and "გახდი PRO".

---

## UI Changes Summary

### Current State
- Tabs: "სტატისტიკა" / dynamic PRO label (already using Georgian labels)
- Tab keys: "Stats" / "PRO"
- Tab style: Pill buttons with flex-1 distribution

### Target State (from images)
- Tabs: "სტატისტიკა" / "გახდი PRO" (with dynamic "ჩემი PRO" when subscribed)
- Tab style: Two equal-width pill buttons matching reference design
- Statistics content: Card rows with Georgian labels (ნათამაშები, მოგებული, მოგების %, საუკეთესო სერია)

---

## Technical Changes

### File: `src/pages/Profile.tsx`

#### 1. Update Tab Labels (lines 39-42)

Change tab configuration to use direct Georgian text matching the reference:

```typescript
const tabs = [
  { key: "Stats", label: "სტატისტიკა" },
  { key: "PRO", label: getProTabLabel() },
];
```

Where `getProTabLabel()` returns:
- "ჩემი PRO" if user has active subscription
- "გახდი PRO" if no subscription

#### 2. Update Statistics Content Labels (lines 166-186)

Update the Georgian labels to match the reference exactly:
- "ნათამაშები" (Games Played) 
- "მოგებული" (Games Won)
- "მოგების %" (Win Rate %)
- "საუკეთესო სერია" (Best Streak)

Currently using translation keys - will update to use direct Georgian text that matches the reference image exactly.

---

## Visual Reference Match

| Reference Image | Implementation |
|-----------------|----------------|
| Tab 1: "სტატისტიკა" (purple when active) | ✅ Already styled correctly |
| Tab 2: "გახდი PRO" (white when inactive) | ✅ Update label text |
| Stats cards with rounded borders | ✅ Already using `rounded-2xl` |
| Georgian stat labels | ✅ Will use exact text from image |

---

## Files to Modify

1. **src/pages/Profile.tsx** - Update tab labels and stat row labels

---

## No Backend Changes Required

This is a UI-only change affecting text labels and styling. All data fetching and PRO logic remains unchanged.
