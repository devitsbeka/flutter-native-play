

## Decrease Gaps Between Like/Save and Play Button

### Problem
The like and save buttons with their counts are spaced too far apart (gap-6) and use large icons/text, causing them to crowd into the play button area.

### Changes

**File: `src/components/social/TriviaPortfolioCard.tsx`**

1. **Reduce gap between like and save buttons**: Change `gap-6` to `gap-3` on the stats container (line ~139).
2. **Reduce icon sizes**: Change icon images from `w-[26px] h-[26px]` to `w-5 h-5` (lines ~146, ~157).
3. **Reduce count text size**: Change `text-[17px]` to `text-sm` on the count spans (lines ~149, ~160).
4. **Reduce inner gaps**: Change `gap-1.5` to `gap-1` on individual like/save button containers.

These changes will make the stats section more compact, giving proper breathing room before the play button.

