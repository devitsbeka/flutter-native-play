

## Center Gift Banner and Prevent Overlap on Desktop

### Problem
The PRO gift banner extends too far to the right on desktop, overlapping with the right-side action cards panel (daily rewards, missions, chest, powers).

### Solution
Two changes:

**1. Narrow the banner container** (`src/pages/Index.tsx`, line 501)
- Add a `max-w-[600px]` constraint to the banner wrapper so it stays centered and doesn't extend into the right panel area
- Change from `w-full` to include proper max-width

**2. Reduce banner max-width** (`src/components/home/ProGiftBanner.tsx`)
- Change `max-w-[360px] md:max-w-[520px]` to `max-w-[360px] md:max-w-[480px]` to give more breathing room on medium-large screens
- This ensures the banner fits comfortably in the center column without touching the right-side cards

### Technical Details

**File: `src/pages/Index.tsx` (line 501)**
- Update the banner container div to: `"w-full flex justify-center px-4 py-2 relative z-30 lg:pr-[280px]"` — this adds right padding on large screens to account for the fixed right panel, keeping the banner visually centered in the remaining space.

**File: `src/components/home/ProGiftBanner.tsx` (line 42)**
- Reduce `md:max-w-[520px]` to `md:max-w-[480px]` for a tighter fit.

