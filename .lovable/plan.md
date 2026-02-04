
# Add Animated League Stroke to "შენი ლიგა" Label

## Overview

Add a rotating/pulsing stroke animation to the "შენი ლიგა" (Your League) label that changes color based on the user's current league tier:
- **Bronze League (tier 1)**: Bronze/copper gradient stroke
- **Gold League (tier 2)**: Gold gradient stroke  
- **Silver League (tier 3)**: Silver gradient stroke

---

## Implementation Approach

Use a CSS conic-gradient rotating border effect to create a shimmering animated stroke around the label. This creates an elegant "glowing" border that rotates around the element.

---

## Technical Changes

### 1. Add New Keyframe Animation (`tailwind.config.ts`)

Add a new keyframe for rotating border:

```ts
keyframes: {
  // existing...
  'border-rotate': {
    '0%': { '--border-angle': '0deg' },
    '100%': { '--border-angle': '360deg' }
  }
},
animation: {
  // existing...
  'border-rotate': 'border-rotate 3s linear infinite'
}
```

### 2. Create League Stroke Wrapper Component (`src/pages/Leaderboards.tsx`)

Create a styled wrapper that uses a pseudo-element with rotating gradient:

```tsx
const LEAGUE_STROKE_COLORS = {
  1: { // Bronze
    from: '#CD7F32',
    via: '#B87333', 
    to: '#8B4513'
  },
  2: { // Gold
    from: '#FFD700',
    via: '#FFA500',
    to: '#DAA520'
  },
  3: { // Silver
    from: '#C0C0C0',
    via: '#A8A8A8',
    to: '#D3D3D3'
  }
};
```

### 3. Implementation with CSS Variables

Use inline styles to set the gradient colors dynamically based on userTier:

```tsx
// Desktop & Tablet - "შენი ლიგა" label
{activeTier === userTier && (
  <div 
    className="relative p-[2px] rounded-full animate-spin-slow"
    style={{
      background: `conic-gradient(from var(--border-angle, 0deg), ${strokeColors.from}, ${strokeColors.via}, ${strokeColors.to}, ${strokeColors.from})`
    }}
  >
    <span className="block text-sm font-medium text-foreground bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full">
      შენი ლიგა
    </span>
  </div>
)}
```

### 4. Alternative: Simple Framer Motion Animation

Since we already use framer-motion, we can use it for the rotation:

```tsx
<motion.div
  className="relative p-[2px] rounded-full"
  style={{
    background: `linear-gradient(${angle}deg, ${strokeColors.from}, ${strokeColors.via}, ${strokeColors.to})`
  }}
  animate={{ 
    backgroundImage: [
      `linear-gradient(0deg, ${colors.from}, ${colors.via}, ${colors.to})`,
      `linear-gradient(360deg, ${colors.from}, ${colors.via}, ${colors.to})`
    ]
  }}
  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
>
  <span className="...">შენი ლიგა</span>
</motion.div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Leaderboards.tsx` | Add LEAGUE_STROKE_COLORS constant, update "შენი ლიგა" label in both Desktop and Tablet components to use animated gradient border |
| `tailwind.config.ts` | Add `border-rotate` keyframe animation (optional - may use existing `spin-slow`) |

---

## Visual Result

```text
Before:
+-------------------+
| შენი ლიგა         |  <- Plain white/bg badge
+-------------------+

After (Gold league example):
+----🟡---🟡---🟡----+
|    შენი ლიგა      |  <- Animated gold gradient stroke rotating
+----🟡---🟡---🟡----+
```

The stroke will smoothly rotate around the label, creating a premium "glowing ring" effect that matches the user's league color.
