
# Fix Leaderboard List Container: Corners and Gaps

## Issues Identified

From the screenshots:
1. **Corner mismatch**: The drag handle header has `rounded-t-3xl` but the list body has no rounded corners - creating a visible corner mismatch at the top
2. **Gap between elements**: The header (handle bar) and list body are separate containers causing a visible gap/seam
3. **First row corners**: The first player row has sharp corners but should respect the parent container's rounded corners

---

## Solution

Unify the container structure so the header and body share the same rounded container with proper overflow clipping.

### File: `src/pages/Leaderboards.tsx`

**Current Structure (lines 260-318):**
```tsx
<motion.div className="...">
  {/* Separate header container */}
  <button className="bg-background/95 ... rounded-t-3xl ...">
    <div className="handle bar" />
  </button>
  
  {/* Separate body container - no rounding! */}
  <div className="bg-background ...">
    {/* Player rows */}
  </div>
</motion.div>
```

**Fixed Structure:**
```tsx
<motion.div className="bg-background rounded-t-3xl shadow-lg overflow-hidden ...">
  {/* Handle integrated into same container */}
  <button className="py-3 px-4 w-full">
    <div className="handle bar" />
  </button>
  
  {/* List in same container - inherits rounding via overflow-hidden */}
  <div className="overflow-y-auto px-3 pb-32">
    {/* Player rows */}
  </div>
</motion.div>
```

---

## Specific Changes

| Line | Current | Change |
|------|---------|--------|
| 259-266 | Outer motion.div has no bg/rounded | Add `bg-background rounded-t-3xl shadow-lg overflow-hidden` |
| 268-273 | Button has its own `bg-background/95 rounded-t-3xl` | Remove bg and rounded, keep only padding/button behavior |
| 276 | Body has `bg-background` | Remove `bg-background` (inherited from parent) |

---

## Visual Result

- **Unified container** with consistent `rounded-t-3xl` corners
- **No gap** between header and list body
- **First row clips** to container's rounded corners via `overflow-hidden`
- **Seamless appearance** matching the expected design
