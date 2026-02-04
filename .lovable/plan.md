

# Plan: Redesign Profile Page Tabs & Add Stat Icons

## Overview
Restructure the Profile page to show "გახდი PRO" (Become PRO) as a title section with a crown icon rather than a tab button, and add visual icons to each statistic in the Statistics tab.

---

## Changes Summary

### 1. Tab Structure Change
**Current:** Two equal tabs - "სტატისტიკა" and "გახდი PRO" 
**New:** Only "სტატისტიკა" as a tab, with "გახდი PRO" shown as a title/section header with crown icon

### 2. Statistics Icons
Add 3D icons before each stat label:

| Stat | Georgian | Icon |
|------|----------|------|
| Games Played | ნათამაშები | trivia-buzzer-8.png |
| Games Won | მოგებული | trophy-2.png |
| Win Rate | მოგების % | percentage-discount.png |
| Best Streak | საუკეთესო სერია | trophy-shelf.png |

---

## Technical Implementation

### Step 1: Copy New Assets to Project
Copy the user-uploaded icons to `src/assets/icons/`:
- `trivia-buzzer-8.png` → `src/assets/icons/trivia-buzzer-8.png`
- `trophy-2.png` → `src/assets/icons/trophy-2.png`
- `percentage-discount.png` → `src/assets/icons/percentage-discount.png`
- `trophy-shelf.png` → `src/assets/icons/trophy-shelf.png`
- `crown-5.png` → `src/assets/icons/crown-5.png`

### Step 2: Update Profile.tsx

**Remove the two-tab system and create new layout:**

```text
+------------------------------------------+
|  [სტატისტიკა Tab]  |  👑 გახდი PRO       |
+------------------------------------------+
```

**Changes:**
1. Remove `tabs` array - no longer needed as dual tabs
2. Change `activeTab` to track if we're viewing stats or PRO section
3. Add crown icon next to "გახდი PRO" title that acts as a clickable header
4. Add icon imports for the stat icons
5. Update stat cards to include icon images before labels

**New Stats Section Structure:**
```tsx
<div className="bg-card rounded-2xl p-4 flex items-center gap-3 border border-border/30">
  <img src={triviaIcon} alt="" className="w-8 h-8" />
  <span className="text-foreground flex-1">ნათამაშები</span>
  <span className="font-bold text-foreground">{profile.games_played}</span>
</div>
```

**New Tab/Header Layout:**
```tsx
{/* Tab and PRO Header */}
<div className="flex gap-2 mb-6">
  {/* Statistics Tab */}
  <button
    onClick={() => setActiveTab("Stats")}
    className={cn(
      "flex-1 py-3 rounded-full font-semibold text-sm transition-colors",
      activeTab === "Stats"
        ? "bg-primary text-primary-foreground"
        : "bg-secondary text-secondary-foreground"
    )}
  >
    სტატისტიკა
  </button>
  
  {/* PRO Title with Crown - clickable */}
  <button
    onClick={() => setActiveTab("PRO")}
    className="flex-1 flex items-center justify-center gap-2 py-3"
  >
    <img src={crownIcon} alt="" className="w-6 h-6" />
    <span className="font-semibold text-sm text-foreground">
      {currentTier ? "ჩემი PRO" : "გახდი PRO"}
    </span>
  </button>
</div>
```

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/Profile.tsx` | Modify | Update tab structure, add icon imports, update stat cards |
| `src/assets/icons/` | Add files | Copy 5 new icon assets |

---

## Visual Result

**Tab Area:**
- Left side: "სტატისტიკა" as a pill button (active state = purple)
- Right side: Crown icon + "გახდი PRO" as text (not button-styled)

**Statistics Tab (when active):**
```text
[🎮] ნათამაშები                     625
[🏆] მოგებული                       339
[%]  მოგების %                      54%
[🏅] საუკეთესო სერია                 12
```

Each stat card shows the 3D icon on the left, label in middle, value on right.

