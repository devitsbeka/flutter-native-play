
# Fix Mixed Category Display Texts

## Current Issues

Based on the screenshots and code analysis:

1. **Library Picker (CategorySelectorModal.tsx)** - Still shows old text:
   - Title truncated: "სხვადასხვა კატე..." (from `name: "სხვადასხვა კატეგორიები"`)
   - Subtitle: "ყველა კატეგორიიდან"

2. **VS Screen** - Shows both title AND subtitle:
   - "სხვადასხვა" ✓
   - "შერეული კითხვები" ← user wants this REMOVED

## Desired Behavior

| Screen | What to show |
|--------|-------------|
| VS Screen | Only: "სხვადასხვა" + mystery-box icon (NO subtitle) |
| Library Picker | Title: "სხვადასხვა" + Subtitle: "შერეული კითხვები" |

---

## Technical Changes

### 1. CategorySelectorModal.tsx - Update Mixed Category Card

Update the MIXED_CATEGORY constant and display text:

**Line 17:** Change `name` to just "სხვადასხვა"
```tsx
const MIXED_CATEGORY = {
  id: "__mixed__",
  category_id: "__mixed__",
  name: "სხვადასხვა",  // Changed from "სხვადასხვა კატეგორიები"
  icon: "🎁",
  color: "#8B5CF6",
  icon_slug: "mystery-box",
  total_levels: 0,
} as const;
```

**Lines 176-178:** Update subtitle text
```tsx
<p className="text-xs text-white/90 mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
  შერეული კითხვები
</p>
```

---

### 2. VSScreen.tsx - Remove Subtitle

**Remove lines 467-471** - the subtitle for mixed category:
```tsx
// DELETE THIS BLOCK:
{selectedCategory?.id === "__mixed__" && (
  <span className="text-white/70 text-sm" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
    შერეული კითხვები
  </span>
)}
```

VS Screen will then display ONLY:
- Mystery-box icon (w-14 h-14)
- "სხვადასხვა" title

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/team/CategorySelectorModal.tsx` | Update MIXED_CATEGORY name to "სხვადასხვა", change subtitle to "შერეული კითხვები" |
| `src/components/game/VSScreen.tsx` | Remove subtitle block (lines 467-471) |

---

## Visual Result

**VS Screen (after):**
```
   🎁         (mystery-box icon, large)
სხვადასხვა    (title only, no subtitle)
```

**Library Picker (after):**
```
სხვადასხვა        (title)
შერეული კითხვები  (subtitle)
```
