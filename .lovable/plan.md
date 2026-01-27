
# Remove Container and Fix Card Hover Cropping

## Problem Analysis

From the screenshot, there are two issues with the trivia/collections display in the Explore tab:

1. **Back Container**: The `CreatorPortfolioCard` component wraps trivias in a bordered/background container on tablet & desktop (`md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm`) - user wants this removed

2. **Hover Cropping**: Cards use `whileHover={{ scale: 1.02, y: -4 }}` animation, but the parent carousel has `overflow-hidden`, causing the scale effect to be cropped at the edges

---

## Solution

### File: `src/components/social/CreatorPortfolioCard.tsx`

#### 1. Remove Container Styling (Line 141)

**Current:**
```tsx
className="md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm overflow-hidden"
```

**Change to:**
```tsx
className="overflow-visible"
```

This removes the background, border, and shadow on tablet/desktop while allowing hover effects to overflow.

#### 2. Add Breathing Room to Carousel (Line 217)

**Current:**
```tsx
<div className="hidden md:block overflow-hidden w-full max-w-full">
```

**Change to:**
```tsx
<div className="hidden md:block overflow-visible w-full max-w-full py-3">
```

The `overflow-visible` allows scaled cards to not be clipped, and `py-3` adds vertical breathing room for the hover scale effect.

#### 3. Update Carousel Container (Lines 224-226)

**Current:**
```tsx
<Carousel
  opts={{...}}
  className="w-full"
>
  <CarouselContent className="-ml-3">
```

**Change to:**
```tsx
<Carousel
  opts={{...}}
  className="w-full overflow-visible"
>
  <CarouselContent className="-ml-3 overflow-visible">
```

#### 4. Add Padding to Carousel Items (Line 228)

**Current:**
```tsx
<CarouselItem key={trivia.id} className="pl-3 basis-auto">
```

**Change to:**
```tsx
<CarouselItem key={trivia.id} className="pl-3 basis-auto py-2">
```

The `py-2` gives each item vertical breathing room for the hover effect.

---

## Summary of Changes

| Location | Before | After |
|----------|--------|-------|
| Main container (line 141) | `md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm overflow-hidden` | `overflow-visible` |
| Carousel wrapper (line 217) | `overflow-hidden` | `overflow-visible py-3` |
| Carousel (line 224) | `w-full` | `w-full overflow-visible` |
| CarouselContent (line 226) | `-ml-3` | `-ml-3 overflow-visible` |
| CarouselItem (line 228) | `pl-3 basis-auto` | `pl-3 basis-auto py-2` |

---

## Expected Result

After these changes:
- No background/border container around trivia cards on desktop and tablet
- Cards can scale up on hover without being cropped
- Adequate breathing space around cards for the hover animation effect
- Clean, modern look matching the user's expectations
