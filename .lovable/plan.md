

## Fix Plan: Filter Text & Sticky Behavior on Team Page

### Problem 1: Missing Translation Key
The filter option "personal" in `UnifiedFiltersBar.tsx` references `extra.myTriviaParty` which does not exist in any locale file. The correct key is `extra.myTriviaPartyLabel` (which exists in all languages). This causes the raw key string `extra.myTriviaParty` to display in the filter dropdown.

**Fix:** Change `labelKey` from `"extra.myTriviaParty"` to `"extra.myTriviaPartyLabel"` in the `myTriviaFilterOptions` array in `src/components/team/UnifiedFiltersBar.tsx` (line 203).

---

### Problem 2: Filter Bar Sticky Delay/Jump
Currently in `TeamV2.tsx`, the header block (logo, friends bar, tabs) is `sticky top-0 z-20`, and the filter bar is a separate sibling also `sticky top-0 z-30`. This creates a visual issue where the filter bar first scrolls up with the content, then snaps to the top after the header has already stuck -- causing the "delay then jump" behavior.

**Fix:** Move the filter bar inside the same sticky header container so both elements stick together as one unit. This eliminates the jump because the filter bar never needs to "catch up" to the sticky position.

Specifically, in `src/pages/TeamV2.tsx`:
- Move the filter bar block (lines 690-742) inside the existing sticky header `div` (line 604), placing it just before the closing `</div>` on line 688.
- Remove the separate `sticky top-0 z-30` classes from the filter bar wrapper since the parent is already sticky.

### Technical Details

**File: `src/components/team/UnifiedFiltersBar.tsx`**
- Line 203: `{ value: "personal", labelKey: "extra.myTriviaParty" }` changes to `{ value: "personal", labelKey: "extra.myTriviaPartyLabel" }`

**File: `src/pages/TeamV2.tsx`**
- Restructure the sticky containers: merge the filter bar into the header's sticky div so they form a single sticky unit that stays pinned at `top-0` without any scroll delay or visual jump.

