

## Replace Avatar Presets with Mascot Characters (4x2 Grid)

### What Changes

The current avatar selection grid shows 10 human-like cartoon avatars in a 5-column layout. This will be replaced with 8 mascot character avatars arranged in a clean 4-column, 2-row grid.

### Steps

1. **Copy the 8 mascot images into the project**
   - Save each uploaded mascot image to `src/assets/avatars/` as `mascot-avatar-1.png` through `mascot-avatar-8.png`
   - The old `bot-avatar-*.png` files stay in place (they may still be referenced by existing user profiles and opponent logic)

2. **Update `AvatarModal.tsx`**
   - Add imports for the 8 new mascot avatar images
   - Replace `DEFAULT_AVATARS` array to use the 8 mascot images instead of 10 bot avatars
   - Replace `DEFAULT_AVATAR_PATHS` array with corresponding canonical paths for the 8 mascots
   - Rebuild the `BUNDLED_TO_CANONICAL` mapping for the new avatars
   - Change the avatar grid from `grid-cols-5` to `grid-cols-4` so avatars display as 4 columns x 2 rows

3. **Update `avatarUtils.ts`**
   - Add imports for the 8 mascot avatar images
   - Add `mascot-avatar-*.png` entries to the `BOT_AVATAR_MAP` (keeping old bot-avatar entries for backward compatibility with existing user data)
   - Update the `recoverViteHashedAvatar` function to also handle `mascot-avatar-` patterns

### Technical Details

**New file mappings:**
- `mascot-avatar-1.png` -- Purple mascot with crown (blue/purple)
- `mascot-avatar-2.png` -- Green koala mascot with safari hat
- `mascot-avatar-3.png` -- Purple mascot with red headphones
- `mascot-avatar-4.png` -- Green mascot with beret cap
- `mascot-avatar-5.png` -- Orange mascot with sombrero
- `mascot-avatar-6.png` -- Red mascot with goggles (pink)
- `mascot-avatar-7.png` -- Blue mascot with yellow beanie
- `mascot-avatar-8.png` -- Yellow mascot with red beret

**Grid layout change:**
```text
Before (5 cols, 2 rows = 10 avatars):
[1] [2] [3] [4] [5]
[6] [7] [8] [9] [10]

After (4 cols, 2 rows = 8 avatars):
[1] [2] [3] [4]
[5] [6] [7] [8]
```

**Backward compatibility:** Old `bot-avatar-*.png` references in existing user profiles will continue to resolve correctly since `avatarUtils.ts` keeps those mappings.

### Files Changed
- 8 new image files copied to `src/assets/avatars/`
- `src/components/home/AvatarModal.tsx` -- new imports, updated arrays, grid-cols-4
- `src/utils/avatarUtils.ts` -- add mascot avatar mappings for URL resolution
