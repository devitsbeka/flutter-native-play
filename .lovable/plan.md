

# Adjust Guest Home Screen Vertical Spacing

## Changes

### File: `src/pages/Index.tsx`

Three targeted margin adjustments:

1. **Mascot avatar (line 556)**: Change `marginTop: -30` to `marginTop: -75` (move up by 45px)

2. **"შესვლა" button section (line 594)**: Change `className="flex flex-col items-center mt-8"` to `className="flex flex-col items-center mt-2"` -- the current `mt-8` is 32px, reducing to `mt-2` (8px) moves the sign-in button up by ~24px

3. **"ან ითამაშე როგორც სტუმარმა" text + arrow (line 625)**: Change `className="flex flex-col items-center mt-4"` to `className="flex flex-col items-center mt-1"` -- reducing from `mt-4` (16px) to `mt-1` (4px) moves the guest text and arrow up by ~12px

## Technical Details

| Element | Current | New | Effect |
|---------|---------|-----|--------|
| Mascot container `marginTop` | `-30` | `-75` | Up 45px |
| Sign-in button wrapper `mt-8` | `mt-8` (32px) | `mt-2` (8px) | Up ~24px |
| Guest text wrapper `mt-4` | `mt-4` (16px) | `mt-1` (4px) | Up ~12px |

All changes are in a single file with 3 line edits.

