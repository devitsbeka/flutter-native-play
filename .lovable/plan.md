

## Fix Challenge Screen: Icon Position and Results Screen

### Problem 1: Icon Overlaps Header
The category icon on the playing screen uses `-top-12` positioning, placing it too high and covering the header title bar.

### Problem 2: Results Screen Text and Icon
- Currently shows "😤" emoji -- replace with the uploaded angry-boy.png image
- Change "ვერ დაამარცხე!" to "ამჯერად დამარცხდი!"

### Changes

**1. Copy asset**
- Copy `user-uploads://angry-boy.png` to `src/assets/icons/angry-boy.png`

**2. File: `src/pages/ChallengeLanding.tsx`**

**Icon position fix (line ~323):**
- Change `-top-12` to `-top-4` so the icon sits properly at the top of the question card without overlapping the header

**Results screen updates (lines ~390-401):**
- Import `angry-boy.png` at the top of the file
- Replace the lose emoji "😤" with an `<img>` tag using the angry-boy icon (sized ~w-16 h-16)
- Change lose text from "ვერ დაამარცხე!" to "ამჯერად დამარცხდი!"

### Technical Details
- The icon overlap is caused by `absolute -top-12` which places the 64px icon 48px above the card container, right into the header area
- Changing to `-top-4` keeps the overlapping aesthetic but prevents header collision
- The angry-boy.png will be imported as an ES6 module for proper bundling
