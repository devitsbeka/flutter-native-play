

# Fix Animated League Stroke - Rotate Border Only

## The Problem

The current implementation rotates the **entire container** including the text, which causes the text to spin around:

```tsx
// Current (WRONG) - rotates everything
<motion.div
  style={{ background: `conic-gradient(...)` }}
  animate={{ rotate: 360 }}  // This rotates text too!
>
  <span>შენი ლიგა</span>
</motion.div>
```

## The Solution

Use a **layered approach** with an absolutely positioned rotating border element behind a static text container:

```text
+---------------------------+
|  Outer container (static) |
|  +---------------------+  |
|  | Rotating gradient   |  |  ← Only this rotates
|  | border (absolute)   |  |
|  +---------------------+  |
|  +---------------------+  |
|  | Static text layer   |  |  ← This stays still
|  | "შენი ლიგა"         |  |
|  +---------------------+  |
+---------------------------+
```

## Technical Implementation

### File: `src/pages/Leaderboards.tsx` (lines 64-81)

Replace the `AnimatedLeagueBadge` component:

```tsx
const AnimatedLeagueBadge = ({ tier, size = 'default' }: { tier: number; size?: 'default' | 'small' }) => {
  const colors = LEAGUE_STROKE_COLORS[tier] || LEAGUE_STROKE_COLORS[1];
  const padding = size === 'small' ? 1.5 : 2;
  
  return (
    <div className="relative">
      {/* Static text layer - stays on top and doesn't rotate */}
      <span 
        className={`relative z-10 block ${size === 'small' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'} font-medium text-foreground bg-background/90 backdrop-blur-sm rounded-full`}
        style={{ margin: padding }}
      >
        შენი ლიგა
      </span>
      
      {/* Rotating gradient border - positioned behind text */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${colors.from}, ${colors.via}, ${colors.to}, ${colors.from})`
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};
```

## Visual Result

| Before | After |
|--------|-------|
| Text spins with border 🌀 | Only border rotates around static text ✓ |
| "შენი ლიგა" is unreadable | "შენი ლიგა" stays perfectly readable |

The gradient stroke will smoothly rotate around the badge while the text remains completely stationary and readable.

