

# Plan: Update Popular Categories & Tab Icons

## Summary

1. **Increase popular categories from 6 to 15**
2. **Daily randomization** - same random order throughout the day, not per page load
3. **Replace "პოპულარული" (Popular) tab icon** with Rubik's cube
4. **Replace "ყველა" (All) tab icon** with puzzle-sphere

---

## Current Behavior

| Feature | Current |
|---------|---------|
| Popular categories count | 6 |
| Randomization | Every page load (Fisher-Yates shuffle) |
| "ყველა" (All) tab icon | `all.png` (current icon) |
| "პოპულარული" (Popular) tab icon | Reuses `funIcon` (game controller) |

## New Behavior

| Feature | New |
|---------|-----|
| Popular categories count | **15** |
| Randomization | **Once per day** (uses date as seed) |
| "ყველა" (All) tab icon | **puzzle-sphere.png** |
| "პოპულარული" (Popular) tab icon | **puzzle-cube.png** (Rubik's cube) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/assets/tabs/` | Add `puzzle-sphere.png` and `puzzle-cube.png` |
| `src/components/shared/IconTabBar.tsx` | Update icon imports and map |
| `src/pages/Discover.tsx` | Change count to 15, add daily seed-based shuffle |

---

## Technical Implementation

### 1. Add New Tab Icons

Copy the uploaded icons to the tabs folder:
- `puzzle-sphere.png` → for "ყველა" (All) tab
- `puzzle-cube.png` → for "პოპულარული" (Popular) tab

### 2. Update IconTabBar.tsx

```typescript
// Add new imports
import allIcon from "@/assets/tabs/puzzle-sphere.png";
import popularIcon from "@/assets/tabs/puzzle-cube.png";

// Update iconMap
const iconMap: Record<string, string> = {
  all: allIcon,           // Now puzzle-sphere
  favorites: favIcon,
  recently_viewed: allIcon,
  popular: popularIcon,   // Now Rubik's cube
  classic: classicIcon,
  fun: funIcon,
  educational: eduIcon,
};
```

### 3. Update Discover.tsx - Daily Seed-Based Shuffle

Replace the current random shuffle with a deterministic daily shuffle:

```typescript
// Get popular categories (random 15, same order for the whole day)
const popularCategories = useMemo(() => {
  if (categories.length === 0) return [];
  
  // Create a daily seed based on current date
  const today = new Date();
  const dailySeed = today.getFullYear() * 10000 + 
                    (today.getMonth() + 1) * 100 + 
                    today.getDate();
  
  // Seeded random function (deterministic)
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  // Fisher-Yates shuffle with seeded random
  const shuffled = [...categories];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(dailySeed + i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, 15);  // Changed from 6 to 15
}, [categories]);
```

**How daily seeding works:**
- `dailySeed = 20260206` (for Feb 6, 2026)
- Same seed produces same shuffle order all day
- At midnight, seed changes → new random order

---

## Visual Result

**Tab Bar (Before):**
```text
[🎮 ყველა] [❤️ ფავორიტები] [🎮 პოპულარული] [❓ კლასიკური] ...
```

**Tab Bar (After):**
```text
[🧩 ყველა] [❤️ ფავორიტები] [🧊 პოპულარული] [❓ კლასიკური] ...
 ↑ puzzle-sphere            ↑ Rubik's cube
```

**Popular Section:**
- Before: 6 random categories, changes on every load
- After: 15 random categories, same order all day

---

## Summary of Changes

1. **Copy icons**: `puzzle-sphere.png` and `puzzle-cube.png` to `src/assets/tabs/`
2. **Update IconTabBar.tsx**: Import new icons and update iconMap
3. **Update Discover.tsx**: 
   - Change popular count from 6 to 15
   - Implement daily-seeded shuffle for consistent order per day

