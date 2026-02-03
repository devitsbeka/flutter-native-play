

# Plan: Update Empty Queue Text in Category Picker Section

## Summary

Update the text shown in the room lobby when no category is selected to use the new Georgian labels with appropriate font sizes.

---

## Current State (Lines 63-83 in CategoryPickerSection.tsx)

```tsx
<p className="text-white font-semibold text-[18px] leading-tight">
  {hasCategory ? categoryName : "აირჩიე კატეგორია"}
</p>
...
<p className="text-white/60 text-[14px] leading-snug">
  {isAlreadyPlayed && hasCategory
    ? "აირჩიე ახალი კატეგორია"
    : hasCategory 
      ? "მიმდინარე კატეგორია" 
      : "დააჭირე არჩევისთვის"}
</p>
```

---

## Requested Changes

| Line | Current | New |
|------|---------|-----|
| 64 | `"აირჩიე კატეგორია"` (font 18px) | `"რისი თამაში გინდა?"` (font **14px**) |
| 82 | `"დააჭირე არჩევისთვის"` (font 14px) | `"დაამატე კატეგორია სათამაშოდ"` (font **12px**) |

---

## Technical Implementation

Update the `CategoryPickerSection.tsx` file:

1. **Line 63-64**: Change the main title text when no category is selected
   - Update text from "აირჩიე კატეგორია" to "რისი თამაში გინდა?"
   - Reduce font size from `text-[18px]` to `text-[14px]` when empty

2. **Line 77-82**: Change the subtitle text when no category is selected
   - Update text from "დააჭირე არჩევისთვის" to "დაამატე კატეგორია სათამაშოდ"
   - Reduce font size from `text-[14px]` to `text-[12px]` when empty

**Updated code structure:**
```tsx
{/* Main title */}
<p className={cn(
  "text-white font-semibold leading-tight",
  hasCategory ? "text-[18px]" : "text-[14px]"
)}>
  {hasCategory ? categoryName : "რისი თამაში გინდა?"}
</p>

{/* Subtitle */}
<p className={cn(
  "leading-snug",
  hasCategory ? "text-white/60 text-[14px]" : "text-white/60 text-[12px]"
)}>
  {isAlreadyPlayed && hasCategory
    ? "აირჩიე ახალი კატეგორია"
    : hasCategory 
      ? "მიმდინარე კატეგორია" 
      : "დაამატე კატეგორია სათამაშოდ"}
</p>
```

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/team/CategoryPickerSection.tsx` | Update empty state text and font sizes |

