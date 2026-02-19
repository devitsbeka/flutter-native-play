

## Changes to Game Results Screen

### 1. Decrease trophy icon by 15%
- **File: `src/components/team/GameResultsScreenV2.tsx`** (line 401)
- Change `w-16 h-16` (64px) to approximately 54px: use `w-[54px] h-[54px]`
- Reduce `mb-2` to `mb-1` to move content up

### 2. Move top section up
- Change `pt-2` (line 397) to `pt-0` on the top section container to reclaim vertical space

### 3. Remove "მე-2 ადგილი" text
- Remove the `<motion.h1>` block (lines 420-427) that displays `{result}` (the rank placement text like "მე-2 ადგილი!")

These three changes will free up vertical space so more of the player list / podium is visible without scrolling.

