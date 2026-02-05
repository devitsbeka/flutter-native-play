

# Plan: Improved Metallic Badge with Better Text Visibility

## Problem

The current metallic badge styling:
- Looks too flat and washed out (especially gold - too yellow/matte)
- Text visibility is poor against the gradient background
- Doesn't capture the polished metal look

## New Approach: Dual-Layer Metallic Effect

Instead of a single gradient, use a layered approach:

1. **Base layer**: Solid metallic core color with depth
2. **Highlight layer**: Subtle white reflection band at top
3. **Border accent**: Darker metallic border for definition
4. **Text with outline**: Dark text with light stroke OR light text with dark shadow

---

## Technical Changes

### File: `src/pages/Leaderboards.tsx`

Replace `AnimatedLeagueBadge` component (lines 65-136):

```tsx
const AnimatedLeagueBadge = ({ tier }: { tier: number }) => {
  // Refined metallic color schemes
  const metallicStyles: Record<number, { 
    base: string;        // Core metallic color
    highlight: string;   // Top highlight
    border: string;      // Border/edge color
    textColor: string;   // Text color for contrast
    shadowColor: string; // Text shadow for depth
  }> = {
    1: { // Bronze - Warm copper tones
      base: '#B87333',
      highlight: 'rgba(222, 184, 135, 0.6)',
      border: '#8B4513',
      textColor: '#FFF8E7',
      shadowColor: 'rgba(69, 35, 10, 0.8)'
    },
    2: { // Silver - Cool chrome
      base: '#A8A8A8',
      highlight: 'rgba(255, 255, 255, 0.7)',
      border: '#6B6B6B',
      textColor: '#1A1A1A',
      shadowColor: 'rgba(255, 255, 255, 0.5)'
    },
    3: { // Gold - Rich warm gold
      base: '#DAA520',
      highlight: 'rgba(255, 236, 139, 0.7)',
      border: '#996515',
      textColor: '#2D1F00',
      shadowColor: 'rgba(255, 255, 255, 0.4)'
    }
  };
  
  const style = metallicStyles[tier] || metallicStyles[1];
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.div
        className="relative rounded-full overflow-hidden"
        style={{
          // Multi-layer background for metallic depth
          background: `
            linear-gradient(180deg, 
              ${style.highlight} 0%, 
              transparent 40%
            ),
            linear-gradient(180deg, 
              ${style.base} 0%, 
              ${style.base} 100%
            )
          `,
          border: `2px solid ${style.border}`,
          boxShadow: `
            0 4px 12px rgba(0,0,0,0.3),
            inset 0 1px 0 ${style.highlight},
            inset 0 -2px 4px rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* Animated light sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
            backgroundSize: '200% 100%'
          }}
          animate={{
            backgroundPosition: ['-100% 0%', '200% 0%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeInOut"
          }}
        />
        
        {/* Text with proper contrast */}
        <span 
          className="relative z-10 block text-sm px-5 py-2 font-bold"
          style={{ 
            color: style.textColor,
            textShadow: `0 1px 2px ${style.shadowColor}, 0 0 1px ${style.shadowColor}`
          }}
        >
          შენი ლიგა
        </span>
      </motion.div>
    </div>
  );
};
```

---

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Gradient** | 7-stop complex gradient | Simple base + highlight overlay |
| **Text contrast** | White on all tiers | Tier-specific: dark on gold/silver, light on bronze |
| **Border** | None | 2px solid darker metallic border |
| **Depth** | Inset shadows only | Border + inset top/bottom shadows |
| **Highlight** | Full gradient sweep | Top-weighted highlight like real metal |

## Color Strategy

- **Bronze**: Light cream text on warm copper (best contrast)
- **Silver**: Dark text on silver (like real engraved silver)
- **Gold**: Dark brown text on gold (like embossed gold plaques)

This mimics how real metallic badges/medals have embossed or engraved text that contrasts with the metal surface.

