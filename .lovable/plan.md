

## Fix: Glass Card Visual Glitches in Room Lobby

### Problem
The room lobby page shows horizontal and vertical line glitches (seams) on the glass-card components. These are sub-pixel rendering artifacts caused by `backdrop-blur` on multiple stacked semi-transparent elements scrolling over a gradient background.

### Root Cause
Three glass-card components use `backdrop-blur-sm` or `backdrop-blur-md` combined with `bg-white/10` and semi-transparent borders. When these elements overlap or sit adjacent during scrolling, the browser compositor creates visible seam lines at their edges.

Additionally, the TV Mode card still uses `border-white/20` (higher opacity) instead of the project standard `border-white/[0.12]`.

### Solution

**File: `src/components/team/RoomLobbyV2.tsx`**

1. **TV Mode card (line 909)**: Change `border-white/20` to `border-white/[0.12]` to match the project standard
2. **All glass cards**: Remove `backdrop-blur-sm`/`backdrop-blur-md` from the content cards entirely. The blur effect is barely noticeable over a solid gradient background anyway, and it's the primary cause of the rendering glitches. Keep the solid `bg-white/10` which provides sufficient glass effect.
3. **Header blur (line 696)**: Keep `backdrop-blur-md` only on the sticky header where it's functional (content scrolls behind it)
4. **Header buttons (lines 700, 726, 737)**: Change `border-white/20` to `border-white/[0.12]` on the header action buttons

**File: `src/components/team/CategoryPickerSection.tsx`**

5. **Line 116**: Remove `backdrop-blur-sm` from the category picker card

**File: `src/components/team/RoomScoreboard.tsx`**

6. **Line 68**: Remove `backdrop-blur-md` from the scoreboard card

### Technical Details

The changes are minimal class string edits:
- `bg-white/10 backdrop-blur-sm border border-white/20` becomes `bg-white/10 border border-white/[0.12]`
- `bg-white/10 backdrop-blur-md border border-white/[0.12]` becomes `bg-white/10 border border-white/[0.12]`

The `will-change-transform` on the scroll container (already in place on line 779) will continue to help with compositing. Removing `backdrop-blur` from content cards eliminates the seam artifacts entirely while maintaining the visual glass-card appearance through the semi-transparent white backgrounds.

