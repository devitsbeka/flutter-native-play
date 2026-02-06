
# Plan: Fix Sticky Headers and Disable Pull-to-Refresh

## Problems Identified

### 1. Pull-to-Refresh Extra Space
When users pull down on the page, extra space appears at the top. This is iOS/Android's native pull-to-refresh behavior bleeding through despite CSS rules.

### 2. Headers Not Sticky
The Profile page and Team page headers don't stay sticky when scrolling because:
- Profile: `PageHeader` is placed inside scrollable content without proper structure
- Team: The header section is not properly wrapped with sticky positioning

---

## Solution Overview

### A. Disable Pull-to-Refresh Globally
Add more aggressive CSS rules to completely prevent overscroll behavior on mobile:

```css
/* Prevent pull-to-refresh and elastic scrolling */
html, body {
  overscroll-behavior: none !important;
  overscroll-behavior-y: none !important;
  -webkit-overflow-scrolling: auto; /* Disable momentum scrolling */
  touch-action: pan-x pan-y; /* Allow scroll but not pull-to-refresh */
}

#main-scroll-container {
  overscroll-behavior: none;
  overscroll-behavior-y: none;
}
```

### B. Fix Profile Page Sticky Header
Restructure Profile page to have a properly sticky header section.

### C. Fix Team Page Sticky Header
Ensure the Team page header stays sticky during scroll.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Add stronger pull-to-refresh prevention rules |
| `src/pages/Profile.tsx` | Restructure header to be properly sticky |
| `src/pages/TeamV2.tsx` | Add sticky wrapper to header section |

---

## Technical Implementation

### 1. Update index.css - Disable Pull-to-Refresh

Add/modify rules in the base layer:

```css
html {
  overflow-y: scroll;
  overscroll-behavior: none;
  overscroll-behavior-y: none;
}

body {
  overscroll-behavior: none;
  overscroll-behavior-y: none;
  -webkit-overflow-scrolling: auto;
  touch-action: pan-x pan-y;
}

#main-scroll-container {
  overscroll-behavior: none;
  overscroll-behavior-y: none;
  -webkit-overflow-scrolling: auto;
}
```

### 2. Update Profile.tsx - Fix Sticky Header

Current structure:
```text
MainLayout
  div.min-h-screen
    video (fixed background)
    PageHeader (tries to be sticky but doesn't work)
    content...
```

New structure:
```text
MainLayout
  div.min-h-screen.flex.flex-col
    PageHeader (sticky - will work now)
    div.flex-1.relative (scrollable content)
      video (fixed background)
      content...
```

### 3. Update TeamV2.tsx - Fix Sticky Header

Add sticky wrapper to the header section:

Current (line ~530):
```jsx
<div className="bg-background w-full max-w-full">
  <div className="px-4 py-3 border-b...">
    {/* Header content */}
  </div>
  {/* Tabs, etc */}
</div>
```

New structure:
```jsx
<div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md">
  <div className="px-4 py-3 border-b...">
    {/* Header content */}
  </div>
  {/* Tabs, etc */}
</div>
```

---

## Visual Result

### Before
```text
[Pull down]
    ↓
╔════════════════════════════╗
║   Extra white space ❌     ║
╠════════════════════════════╣
║   Header (scrolls away)    ║
╠════════════════════════════╣
║   Content                  ║
╚════════════════════════════╝
```

### After
```text
[Pull down - nothing happens]
╔════════════════════════════╗
║   Sticky Header ✓          ║  ← Stays in place
╠════════════════════════════╣
║   Content (scrolls)        ║
║   Content                  ║
║   Content                  ║
╚════════════════════════════╝
```

---

## Summary

1. **CSS changes** - Add aggressive overscroll prevention rules
2. **Profile.tsx** - Restructure layout so header is truly sticky
3. **TeamV2.tsx** - Add sticky wrapper to header/tabs section
