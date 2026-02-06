

# Shop Header and Power Cards Mobile Fixes

## What Changes

Three visual adjustments on mobile for the shop page:

1. **Remove the white circular background** from the coin and gem icons in the header (mobile only) -- they should show the icons directly without the white circle container
2. **Push notification bell and help icons to the right edge** of the header on mobile
3. **Fix the coin price buttons on power-up cards** so the text/icon fits properly inside the button with correct padding

## Changes Summary

| File | Change |
|------|--------|
| `src/components/shop/ShopHeader.tsx` | Remove white circle wrappers around coin/gem icons on mobile; make header use `justify-between` so icons push to the right edge |
| `src/components/shop/MyPowersSection.tsx` | Adjust the price button padding and sizing to ensure coin icon + price text fit within the rounded pill container |

## Technical Details

### ShopHeader.tsx

**Remove white circles on mobile:**
- The coin and gem icons are currently wrapped in a `w-7 h-7 rounded-full bg-white/90` div
- On mobile, remove this white circle wrapper -- show the icon directly
- On desktop/tablet, keep the white circle as-is
- Implementation: Use responsive classes -- on mobile show a plain icon, on `md:` and above show the white circle version

**Push icons to the right edge:**
- Currently the header uses `justify-between` but on mobile the title is hidden, so everything clusters to the right via `gap-3` only
- Change the outer container to use `justify-between` on mobile too, with the wallet on the left and action icons on the right
- Alternatively, use `w-full justify-between` on the inner flex to spread wallet and actions apart on mobile
- On mobile: Safe icon + coins/gems on the left, bell + help on the right edge

### MyPowersSection.tsx

**Fix price button overflow:**
- The current button uses `px-3 py-1.5` which may not be enough for larger price numbers
- Reduce the font size slightly or adjust padding to ensure the coin icon + price number fit within the pill
- Change from `px-3` to `px-2.5` and use `text-xs` instead of `text-sm` to prevent overflow
- Add `whitespace-nowrap` and `min-w-0` to prevent text wrapping or overflow
- Ensure the button has `justify-center` for proper centering

