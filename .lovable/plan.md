

## Fix: Delete Button Hidden Behind Footer

### Problem
The question card content (icon + question text + 4 answers + delete button) is taller than the available screen space between the fixed header and the fixed footer. The `CarouselItem` uses `items-center` which vertically centers content but prevents scrolling, so the delete button at the bottom is permanently hidden behind the save footer.

### Solution
Make each `CarouselItem` vertically scrollable so users can scroll down to reach the delete button when the card is taller than the viewport.

### Changes in `src/components/social/EditQuizModal.tsx`

**Line 469** -- Change the CarouselItem class:
- From: `flex items-center justify-center px-4 pb-24`
- To: `flex items-start justify-center px-4 pb-24 overflow-y-auto`

Replacing `items-center` with `items-start` ensures the card starts at the top and the user can scroll down to see the delete button. Adding `overflow-y-auto` enables scrolling within the carousel item when content overflows.

This is a single-line class change.
