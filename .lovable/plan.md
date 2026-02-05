
# Plan: Premium Metallic Surface Badge Styling

## Current Issue

The "შენი ლიგა" badge looks flat with washed-out colors (as seen in screenshot - too yellow/matte gold). Need realistic polished metal effect.

## Solution: Real Metallic Surface Gradients

Create gradients that simulate polished metal by:
1. Adding darker tonal contrast (shadows)
2. Using multiple highlight bands (like light hitting curved metal)
3. Adding subtle edge definition

---

## Technical Changes

### File: `src/pages/Leaderboards.tsx`

Update the `metallicStyles` object with improved metallic gradients:

```tsx
const metallicStyles: Record<number, { 
  gradient: string; 
  shadow: string;
}> = {
  1: { // Bronze - Rich polished bronze with depth
    gradient: 'linear-gradient(145deg, #8B5A2B 0%, #CD853F 15%, #DEB887 30%, #F4A460 50%, #CD853F 65%, #8B4513 85%, #A0522D 100%)',
    shadow: '0 4px 20px rgba(139, 90, 43, 0.7), inset 0 2px 6px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.2)'
  },
  2: { // Silver - Polished chrome/silver effect
    gradient: 'linear-gradient(145deg, #808080 0%, #C0C0C0 15%, #F5F5F5 30%, #FFFFFF 45%, #E8E8E8 55%, #B8B8B8 75%, #909090 100%)',
    shadow: '0 4px 20px rgba(150, 150, 150, 0.6), inset 0 2px 6px rgba(255,255,255,0.6), inset 0 -2px 6px rgba(0,0,0,0.15)'
  },
  3: { // Gold - Lustrous 24K gold effect
    gradient: 'linear-gradient(145deg, #996515 0%, #D4A017 15%, #FFD700 30%, #FFEC8B 45%, #FFD700 55%, #DAA520 75%, #B8860B 100%)',
    shadow: '0 4px 20px rgba(218, 165, 32, 0.7), inset 0 2px 6px rgba(255,255,255,0.5), inset 0 -2px 6px rgba(0,0,0,0.2)'
  }
};
```

### Visual Breakdown

**Key improvements:**
- **145deg angle**: More natural light reflection angle
- **7 color stops**: Creates realistic curved metal reflection bands
- **Dark → Light → Highlight → Light → Dark**: Simulates cylindrical metal surface
- **Inset shadows**: Both top highlight AND bottom shadow for 3D depth

```text
Gradient structure (simulates light hitting curved metal):

  ┌─────────────────────────────────────────┐
  │ Dark edge (shadow)           0%         │
  │ Mid-tone                    15%         │
  │ Light zone                  30%         │
  │ ★ BRIGHT HIGHLIGHT ★        45%         │  ← Peak reflection
  │ Light zone                  55%         │
  │ Mid-tone                    75%         │
  │ Dark edge (shadow)         100%         │
  └─────────────────────────────────────────┘
```

### Color Reference

| Tier | Dark | Mid | Highlight | Effect |
|------|------|-----|-----------|--------|
| Bronze | #8B5A2B | #CD853F | #DEB887 | Antique polished bronze |
| Silver | #808080 | #C0C0C0 | #FFFFFF | Chrome mirror finish |
| Gold | #996515 | #D4A017 | #FFEC8B | 24K lustrous gold |

---

## Result

Badge will look like polished metal jewelry instead of flat colored buttons - with visible light bands that create depth and shine.
