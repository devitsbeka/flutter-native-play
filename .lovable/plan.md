
# Premium Metallic League Badge - Bottom Only with Light Animation

## Overview

Remove the "შენი ლიგა" badge from the header navigation areas and keep it only at the bottom (above the "View Rating" button). Transform the badge into a fully metallic premium element with a subtle light shimmer animation - like real gold, silver, or bronze surfaces catching light.

---

## Changes Summary

### 1. Remove Badge from Header Areas

Remove `AnimatedLeagueBadge` from:
- **Mobile header** (line 267): Remove from the league navigation bar at top
- **Tablet header** (lines 666-668): Remove from inside the blur container header

### 2. Keep Badge Only at Bottom Locations

Keep the badge in these locations:
- **Desktop**: Bottom, above "ნახე რეიტინგი" button (line 525)
- **Tablet**: Bottom, above "ნახე რეიტინგი" button (line 689)

### 3. Redesign Badge as Premium Metallic Element

Transform the badge from a text pill with gradient stroke into a fully metallic element:

```text
Current Design:
+--[gradient border]--+
|  შენი ლიგა (text)   |  ← White background with gradient stroke
+---------------------+

New Design:
+=====================+
|  შენი ლიგა          |  ← Fully metallic gradient fill
|  with light sweep   |  ← Animated highlight moving across
+=====================+
```

---

## Technical Implementation

### File: `src/pages/Leaderboards.tsx`

#### A. Update `AnimatedLeagueBadge` Component (lines 64-95)

Replace with a premium metallic badge with light sweep animation:

```tsx
const AnimatedLeagueBadge = ({ tier }: { tier: number }) => {
  // Metallic color schemes for each tier
  const metallicStyles: Record<number, { 
    gradient: string; 
    shadow: string;
    textColor: string;
  }> = {
    1: { // Bronze
      gradient: 'linear-gradient(135deg, #CD7F32 0%, #E8B066 25%, #CD7F32 50%, #8B4513 75%, #CD7F32 100%)',
      shadow: '0 2px 8px rgba(205, 127, 50, 0.4)',
      textColor: '#5D3A1A'
    },
    2: { // Silver  
      gradient: 'linear-gradient(135deg, #C0C0C0 0%, #F0F0F0 25%, #E8E8E8 50%, #A8A8A8 75%, #C0C0C0 100%)',
      shadow: '0 2px 8px rgba(192, 192, 192, 0.4)',
      textColor: '#4A4A4A'
    },
    3: { // Gold
      gradient: 'linear-gradient(135deg, #FFD700 0%, #FFF4B0 25%, #FFD700 50%, #DAA520 75%, #FFD700 100%)',
      shadow: '0 2px 8px rgba(255, 215, 0, 0.4)',
      textColor: '#5C4800'
    }
  };
  
  const style = metallicStyles[tier] || metallicStyles[1];
  
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Main metallic badge */}
      <motion.div
        className="relative rounded-full overflow-hidden"
        style={{
          background: style.gradient,
          backgroundSize: '200% 200%',
          boxShadow: style.shadow,
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Light sweep overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
            backgroundSize: '200% 100%'
          }}
          animate={{
            backgroundPosition: ['-100% 0%', '200% 0%']
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatDelay: 1.5,
            ease: "easeInOut"
          }}
        />
        
        {/* Text */}
        <span 
          className="relative z-10 block text-sm px-4 py-1.5 font-bold"
          style={{ color: style.textColor }}
        >
          შენი ლიგა
        </span>
      </motion.div>
    </div>
  );
};
```

#### B. Remove from Mobile Header (around line 267)

```tsx
// BEFORE (lines 262-269)
<div className="text-center flex-1 min-w-0">
  <h2 className="text-lg text-foreground font-bold whitespace-nowrap drop-shadow-md">
    {LEAGUE_NAMES[activeTier || 1]?.toUpperCase() || 'LEAGUE'}
  </h2>
  {activeTier === userTier && (
    <AnimatedLeagueBadge tier={userTier} size="small" />
  )}
</div>

// AFTER - Remove the badge
<div className="text-center flex-1 min-w-0">
  <h2 className="text-lg text-foreground font-bold whitespace-nowrap drop-shadow-md">
    {LEAGUE_NAMES[activeTier || 1]?.toUpperCase() || 'LEAGUE'}
  </h2>
</div>
```

#### C. Remove from Tablet Header (around lines 662-669)

```tsx
// BEFORE
<div className="text-center">
  <h2 className="text-lg text-foreground font-bold whitespace-nowrap">
    {LEAGUE_NAMES[currentTier]?.toUpperCase() || 'LEAGUE'}
  </h2>
  {currentTier === userTier && (
    <AnimatedLeagueBadge tier={userTier} size="small" />
  )}
</div>

// AFTER - Remove the badge, simplify structure
<span className="text-lg text-foreground font-bold whitespace-nowrap">
  {LEAGUE_NAMES[currentTier]?.toUpperCase() || 'LEAGUE'}
</span>
```

#### D. Update Component Props

Since we removed the `size` prop usage, update the component to no longer accept it:

```tsx
// BEFORE
const AnimatedLeagueBadge = ({ tier, size = 'default' }: { tier: number; size?: 'default' | 'small' })

// AFTER  
const AnimatedLeagueBadge = ({ tier }: { tier: number })
```

---

## Visual Effect Explanation

The new metallic badge will have two animated layers:

```text
Layer 1: Metallic Base Gradient
┌─────────────────────────────┐
│ Gold → Light Gold → Gold →  │  ← Slowly shifts position
│ Dark Gold → Gold            │     (4 second cycle)
└─────────────────────────────┘

Layer 2: Light Sweep Overlay
        ╱ ╲
       ╱   ╲                  ← Bright white highlight
      ╱     ╲                    sweeps across every 4s
┌────╱───────╲────────────────┐
│   ╱         ╲               │
└──╱───────────╲──────────────┘
   → → → → → → →
```

The combination creates a premium "catching light" effect like polished metal.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Leaderboards.tsx` | Update `AnimatedLeagueBadge` with metallic design, remove from headers |

---

## Responsive Behavior

| Device | Header | Bottom (Above Button) |
|--------|--------|----------------------|
| Mobile | No badge | Badge shown (when viewing own league) |
| Tablet | No badge | Badge shown (when viewing own league) |
| Desktop | No badge | Badge shown (when viewing own league) |

The premium metallic badge will only appear at the bottom, directly above the "ნახე რეიტინგი" button, creating a premium indicator that the user is viewing their own league.
