

## Fix Category Title Overflow and "+" Button Squeeze

### Problem
When a round/category title is long (e.g., "ცოდნა Breaking Bad-ის შესახებ"), the title text pushes the "+" (add category) button, squeezing it or making it hard to tap. The title should be truncated with ellipsis (...) instead.

### Solution
Three small CSS changes in `CategoryPickerSection.tsx`:

1. **Prevent "+" button from shrinking**: Add `flex-shrink-0` to the "+" button wrapper so it always keeps its intended size
2. **Allow the left content to shrink**: Add `min-w-0` and `flex-1` to the left flex container so it can shrink when space is limited
3. **Truncate long titles**: Add `truncate` to the category name `<p>` element so long text gets cut off with "..." instead of wrapping to multiple lines

### Expected Result
- Short titles: displayed fully, no change
- Long titles like "ცოდნა Breaking Bad-ის შესახებ": displayed as "ცოდნა Breaking Bad-ის შე..." (single line, truncated)
- The "+" button always stays at its full 10x10 size, never squeezed

### Technical Details

**File: `src/components/team/CategoryPickerSection.tsx`**

| Line | Current | Change |
|------|---------|--------|
| 119 | `<div className="flex items-center gap-3">` | Add `min-w-0 flex-1` to allow shrinking |
| 133-136 | `<p className="text-white font-semibold leading-tight ...">` | Add `truncate` class to enable ellipsis |
| 163 | `<div className="w-10 h-10 rounded-xl ...">` | Add `flex-shrink-0` to prevent squeeze |

