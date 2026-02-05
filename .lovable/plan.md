

# Plan: Reorganize Discover Page Tabs

## Overview
The user wants to restructure the Discover page tabs and content organization:

### Current State
**Tabs:** ყველა (All), ფავორიტები (Favorites), კლასიკური (Classic), გართობა (Fun), სასწავლო (Educational)

**"ყველა" (All) tab shows sections:**
- ჩემი ფავორიტები (My Favorites)
- ბოლოს ნანახი (Recently Viewed)
- პოპულარული (Popular)
- კლასიკური ტრივია (Classic Trivia)
- გართობა (Fun)
- სასწავლო (Educational)

### Desired State
**New tabs:** ფავორიტები, ბოლოს ნანახი, პოპულარული, კლასიკური, გართობა, სასწავლო

**"ყველა" (All) tab should ONLY show:**
- კლასიკური (Classic)
- გართობა (Fun)
- სასწავლო (Educational)

---

## Implementation Details

### File 1: `src/pages/Discover.tsx`

| Change | Description |
|--------|-------------|
| Update tabs array | Add "recently_viewed" and "popular" tabs; reorder tabs |
| Modify "all" tab content | Remove favorites, recently viewed, and popular sections from "ყველა" |
| Add "recently_viewed" tab handler | Show recently viewed categories in grid when that tab is active |
| Add "popular" tab handler | Show popular categories in grid when that tab is active |

**Updated tabs array:**
```text
- { id: "favorites", label: "ფავორიტები" }
- { id: "recently_viewed", label: "ბოლოს ნანახი" }
- { id: "popular", label: "პოპულარული" }
- { id: "classic", label: "კლასიკური" }
- { id: "fun", label: "გართობა" }
- { id: "educational", label: "სასწავლო" }
```

**"ყველა" tab content (simplified):**
Only shows three sections:
1. Classic categories carousel
2. Fun categories carousel
3. Educational categories carousel

**New tab handlers:**
- `recently_viewed`: Display recently viewed categories in grid layout
- `popular`: Display popular categories in grid layout

---

### File 2: `src/locales/ka.ts`

| Change | Description |
|--------|-------------|
| Add translation key | `discover.recentlyViewedTab` for the tab label |
| Add translation key | `discover.noRecentlyViewed` for empty state message |
| Note: `discover.popular` already exists |

---

### File 3: `src/components/shared/IconTabBar.tsx`

| Change | Description |
|--------|-------------|
| Add new icon mappings | Add icons for "recently_viewed" and "popular" tabs |
| Note: Will need to add icon assets or reuse existing ones |

---

### File 4: `src/assets/tabs/` (New Icons)

| Asset | Description |
|-------|-------------|
| `recently_viewed.png` or reuse existing | Icon for "ბოლოს ნანახი" tab |
| `popular.png` or reuse existing | Icon for "პოპულარული" tab |

**Alternative:** Use existing icons temporarily (e.g., `all.png` with different tint) until new icons are created.

---

## Technical Flow

```text
Tab Selection Flow:
                                    
  ┌─────────────────────────────────────────────────────────────────────┐
  │                         IconTabBar                                   │
  │  [ფავორიტები] [ბოლოს ნანახი] [პოპულარული] [კლასიკური] [გართობა] [სასწავლო]  │
  └─────────────────────────────────────────────────────────────────────┘
           │                │              │             │        │       │
           ▼                ▼              ▼             ▼        ▼       ▼
       favorites      recently_viewed  popular      classic    fun   educational
           │                │              │             │        │       │
           ▼                ▼              ▼             ▼        ▼       ▼
       Grid View        Grid View      Grid View    Grid View  Grid   Grid
       (favs only)     (recent only)  (popular)    (classic)  (fun)  (edu)
```

**Removed from "all" tab:**
- ~~ჩემი ფავორიტები section~~
- ~~ბოლოს ნანახი section~~
- ~~პოპულარული section~~

---

## Files to Modify

| File | Type of Change |
|------|----------------|
| `src/pages/Discover.tsx` | Update tabs, modify content sections, add new tab handlers |
| `src/locales/ka.ts` | Add new translation keys |
| `src/components/shared/IconTabBar.tsx` | Add icon mappings for new tabs |
| `src/assets/tabs/` | May need new icon assets |

---

## Edge Cases Handled

- Empty "recently viewed" shows appropriate message
- Empty "popular" shows categories even if user hasn't interacted
- Default tab can remain "favorites" or become first tab based on preference
- Remove "all" tab entirely since individual type tabs now exist

---

## Alternative Consideration

Since there's no longer a need for an "all" tab (all content types have their own tabs now), we can either:

**Option A:** Remove "ყველა" tab entirely, start with "ფავორიტები" as default
**Option B:** Keep "ყველა" showing only კლასიკური/გართობა/სასწავლო sections

Based on the user's request, **Option B** is preferred - keep "ყველა" but only show the three category type sections.

