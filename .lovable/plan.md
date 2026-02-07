

## Make Filter Dropdown Items Finger-Friendly

The filter dropdown items are currently too small and cramped for comfortable mobile tapping. This update will increase the vertical padding, font size, and overall spacing to make each item easier to tap.

### Changes

**File: `src/components/team/UnifiedFiltersBar.tsx`**

1. **Increase dropdown content padding** -- add more vertical padding (`py-2`) to the `DropdownMenuContent` so there's breathing room at the top and bottom of the list.

2. **Increase each filter/sort item height and font size** -- override the default `DropdownMenuItem` styling with `py-3 text-[15px]` (bumping font from 14px to 15px and increasing vertical padding from 6px to 12px per side), making each row taller and text more readable.

3. **Increase label font size** -- bump the section labels ("ფილტრი", "დალაგება") from `text-xs` to `text-[13px]` with added top padding for better visual separation.

### Technical Details

In `UnifiedFiltersBar.tsx`:

- Line 111: `DropdownMenuContent` -- change className from `"w-52"` to `"w-56 py-2"`
- Line 112: `DropdownMenuLabel` -- change className from `"text-xs text-muted-foreground"` to `"text-[13px] text-muted-foreground pt-1 pb-1"`
- Lines 114-123: Each `DropdownMenuItem` in the filter section -- add `"py-3 text-[15px]"` to the className (appended after the conditional active styling)
- Line 121: Increase the label span font to match -- already inherits from parent
- Line 129: `DropdownMenuLabel` for sort section -- same treatment as line 112
- Lines 131-141: Each `DropdownMenuItem` in the sort section -- same `"py-3 text-[15px]"` treatment
