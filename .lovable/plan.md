

# Fix "დიდი" Bundle Icon - Replace Screenshot with Magic Forge

## Issue
The "დიდი" (Large) bundle in the "სუპერ ძალები" section is showing a screenshot instead of the proper magic forge icon (anvil with fire).

## Root Cause
The wrong image was copied to `src/assets/icons/magic-forge.png` earlier. It currently shows a screenshot of the shop UI instead of the intended forge icon.

## Solution

### Replace Asset

Copy the correct magic forge icon from user uploads:

| Source | Destination |
|--------|-------------|
| `user-uploads://magic-forge.png` (anvil with fire) | `src/assets/icons/magic-forge.png` |

This will overwrite the incorrect screenshot with the proper icon.

---

## Files Summary

| File | Action |
|------|--------|
| `src/assets/icons/magic-forge.png` | Replace with correct anvil/forge icon |

---

## Visual Result

The "დიდი" (Large) bundle will show the anvil with blue fire icon instead of the screenshot, matching the other magical-themed icons in the section.

