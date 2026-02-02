
# Plan: Responsive Logo Size + Bolder LIVE Text

## Issues to Address

1. **Logo size not responsive** - Currently uses fixed `size="md"` on mobile, but doesn't scale up for tablet/desktop
2. **"LIVE" text looks thin** - Currently uses `font-bold` (700 weight) but should be bolder for better visual impact

---

## Technical Changes

### File 1: `src/components/shared/MyTriviaLiveLogo.tsx`

Add a new **responsive** prop that automatically selects the right size based on screen width:

```typescript
// Add responsive prop option
interface MyTriviaLiveLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  responsive?: boolean;  // NEW: Auto-size based on breakpoint
  textColor?: "light" | "dark";
  className?: string;
}
```

When `responsive={true}`, the component uses the breakpoint hook to select:
- **Mobile** (< 768px): `sm` (fontSize: 20px)
- **Tablet** (768px - 1024px): `md` (fontSize: 28px)  
- **Desktop** (> 1024px): `lg` (fontSize: 40px)

```typescript
import { useBreakpoint } from "@/hooks/use-breakpoint";

export function MyTriviaLiveLogo({ 
  size = "md", 
  responsive = false,
  textColor = "dark",
  className = "" 
}: MyTriviaLiveLogoProps) {
  const breakpoint = useBreakpoint();
  
  // Auto-size based on breakpoint when responsive is enabled
  let effectiveSize = size;
  if (responsive) {
    if (breakpoint === "xxs" || breakpoint === "xs" || breakpoint === "sm") {
      effectiveSize = "sm";  // Mobile
    } else if (breakpoint === "md") {
      effectiveSize = "md";  // Tablet
    } else {
      effectiveSize = "lg";  // Desktop (lg, xl, 2xl)
    }
  }
  
  const config = sizeConfig[effectiveSize];
  // ... rest of component
}
```

---

### File 2: `src/components/social/LiveBadge.tsx`

Make the "LIVE" text bolder by changing from `font-bold` to `font-black`:

```typescript
// Before:
className={`... ${config.text} font-bold uppercase tracking-wider text-white`}

// After:
className={`... ${config.text} font-black uppercase tracking-wider text-white`}
```

**Font weights comparison:**
- `font-bold` = 700 (current)
- `font-extrabold` = 800
- `font-black` = 900 (thickest, recommended)

---

### File 3: `src/pages/Index.tsx`

Update the header logo to use responsive sizing:

```typescript
// Before (line 435):
<MyTriviaLiveLogo size="md" className="md:hidden" />

// After:
<MyTriviaLiveLogo responsive className="md:hidden" />
```

This shows:
- **Mobile**: Small logo (20px)
- **Tablet**: Medium logo (28px) - though hidden on md+ in current implementation
- **Desktop**: Large logo (40px) - hidden by `md:hidden`, but if shown elsewhere it scales

---

## Visual Comparison

**Before:**
```
Mobile:    MyTrivia [LIVE]  ← 28px (md), thin "LIVE"
Tablet:    MyTrivia [LIVE]  ← 28px (md), thin "LIVE"  
Desktop:   MyTrivia [LIVE]  ← 28px (md), thin "LIVE"
```

**After:**
```
Mobile:    MyTrivia [LIVE]  ← 20px (sm), bold "LIVE"
Tablet:    MyTrivia [LIVE]  ← 28px (md), bold "LIVE"  
Desktop:   MyTrivia [LIVE]  ← 40px (lg), bold "LIVE"
```

---

## Summary

| File | Change |
|------|--------|
| `MyTriviaLiveLogo.tsx` | Add `responsive` prop with breakpoint-based sizing |
| `LiveBadge.tsx` | Change `font-bold` to `font-black` for bolder "LIVE" text |
| `Index.tsx` | Use `responsive` prop on header logo |

The responsive approach keeps backwards compatibility - existing usages with explicit `size="sm"` or `size="lg"` still work, while new `responsive` prop enables automatic scaling.
