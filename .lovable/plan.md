

# Subtle Shimmer Stroke Animation for League Badge

## Current Issue

The gradient element behind the text is fully rotating like a spinning object. This looks wrong and distracting.

## Desired Effect

A **subtle shimmer/glow effect on the border stroke** that makes the gradient appear to flow or pulse gently - similar to how premium badges or metallic surfaces catch light.

---

## Implementation Approach

Instead of rotating the entire element, use a **gradient position animation** that creates a subtle shimmer effect moving across the border:

### Option 1: Animated Gradient Position (Shimmer Effect)

Animate the gradient angle/position to create a light "sweep" effect:

```tsx
const AnimatedLeagueBadge = ({ tier, size = 'default' }: { tier: number; size?: 'default' | 'small' }) => {
  const colors = LEAGUE_STROKE_COLORS[tier] || LEAGUE_STROKE_COLORS[1];
  const padding = size === 'small' ? 2 : 2.5;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Animated gradient border with shimmer effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${colors.from}, ${colors.via}, ${colors.to}, ${colors.via}, ${colors.from})`,
          backgroundSize: '200% 100%'
        }}
        animate={{ 
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
      {/* Static text layer */}
      <span 
        className={`relative z-10 block ${size === 'small' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'} font-medium text-foreground bg-background/90 backdrop-blur-sm rounded-full`}
        style={{ margin: padding }}
      >
        შენი ლიგა
      </span>
    </div>
  );
};
```

### How It Works

```text
Time 0:    [Gold]--[Orange]--[DarkGold]
           ↓ shimmer moves right →
Time 1.5:  [DarkGold]--[Gold]--[Orange]
           ↓ shimmer moves right →
Time 3:    [Gold]--[Orange]--[DarkGold]  (loop)
```

The gradient colors smoothly shift position, creating a subtle metallic shimmer effect like light reflecting off a gold/silver/bronze surface.

---

## Technical Details

| Property | Value | Purpose |
|----------|-------|---------|
| `backgroundSize` | `200% 100%` | Makes gradient wider than element for animation range |
| `backgroundPosition` | `0% → 100% → 0%` | Animates gradient sliding across |
| `duration` | `3s` | Slow, subtle effect |
| `ease` | `easeInOut` | Smooth, natural motion |

---

## Visual Result

| Before | After |
|--------|-------|
| Full element rotates behind text | Subtle shimmer flows across border |
| Distracting, looks broken | Premium, elegant metallic effect |
| Motion everywhere | Minimal, smooth animation |

The border will have a gentle "light sweep" effect that makes the gold/silver/bronze colors shimmer subtly, similar to how real metallic surfaces catch light.

---

## File to Modify

| File | Change |
|------|--------|
| `src/pages/Leaderboards.tsx` | Replace rotation animation with `backgroundPosition` shimmer animation |

