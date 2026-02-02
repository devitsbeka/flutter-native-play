

# Redesign PRO Carousel - Combined Layout with Mascot on Right

## Overview
Merge the separate header banner and carousel card into one unified design. The mascot will be positioned on the right side of the card (large, not flipped), while the PRO content stays on the left - matching the reference design.

## Current Structure
```text
╭────────────────────────────────────────╮
│  👑 გახდი PRO          [Small Mascot] │  ← Header Banner
╰────────────────────────────────────────╯

╭────────────────────────────────────────╮
│  [Icon] სოლო PRO                       │
│  ₾9.99/თვე                             │  ← Separate Card
│  ✓ Benefit 1                           │
│  ✓ Benefit 2                           │
│  [     გააქტიურება     ]               │
╰────────────────────────────────────────╯
```

## New Combined Design
```text
╭───────────────────────────────────────────────────╮
│                                                   │
│  [Icon]  სოლო PRO        │                        │
│  ₾9.99/თვე               │                        │
│                          │     [MASCOT]           │
│  ✓ 2x XP ბონუსი          │      (large)          │
│  ✓ ექსკლუზიური VIP ბეჯი  │    (not flipped)      │
│  ✓ რეკლამების გარეშე     │                        │
│                          │                        │
│  [    გააქტიურება    ]   │                        │
│                                                   │
╰───────────────────────────────────────────────────╯
```

## Technical Changes

### File: `src/components/shop/MobileProCarousel.tsx`

**1. Remove the separate header banner (lines 75-97)**

The header with "გახდი PRO" text and small mascot will be removed entirely.

**2. Restructure the card layout**

Change from single-column to a two-column flex layout:
- **Left column (~60%)**: PRO icon, title, price, benefits, CTA button
- **Right column (~40%)**: Large mascot image (not flipped, natural position facing left toward content)

**3. Updated JSX structure:**

```tsx
<div className="px-4 pt-4 pb-2">
  {/* Combined PRO Card with Mascot */}
  <div className="relative overflow-hidden rounded-3xl">
    <AnimatePresence mode="wait">
      <motion.div
        key={tier.id}
        className="relative rounded-2xl overflow-hidden flex"
        style={{ background: tier.gradient, ... }}
      >
        {/* Left: Content */}
        <div className="flex-1 p-4 z-10">
          {/* Icon + Title + Price */}
          {/* Benefits */}
          {/* CTA Button */}
        </div>
        
        {/* Right: Mascot */}
        <div className="w-[140px] flex-shrink-0 relative">
          <img 
            src={proMascot} 
            alt="" 
            className="absolute bottom-0 right-0 w-[160px] h-auto object-contain"
            // No transform - natural position facing left
          />
        </div>
      </motion.div>
    </AnimatePresence>
  </div>
  
  {/* Dot Indicators */}
</div>
```

**4. Mascot positioning**
- Remove `transform: scaleX(-1)` - mascot naturally faces left toward the content
- Position at bottom-right, slightly overflowing for dynamic look
- Size ~160px width to match reference

**5. Remove unused import**
- Remove `iconVipCrown` import since header banner is removed

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/shop/MobileProCarousel.tsx` | Restructure layout, remove header, add mascot to card |

---

## Visual Result

The PRO subscription section becomes a single, cohesive card with the friendly blue mascot prominently displayed on the right side, creating a more engaging and unified appearance that matches the reference design.

