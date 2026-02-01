
## Fix Room Icon Picker Modal Scrolling Issue

### Problem Analysis
The Room Icon Picker modal has a non-scrollable, stuck layout on mobile devices. Looking at the screenshot, the user is on the icon/name change screen and content is cut off.

**Root Cause:**
The modal uses hardcoded pixel values for positioning that don't account for:
1. Safe area insets on notched devices (iPhone, Android with cutouts)
2. Variable height of the search section (changes when category filters are shown/hidden)
3. The gap between fixed headers and scrollable content

**Current Layout Issues:**
- Header: `fixed top-0` with `safe-top` class (which has no effect - not defined in CSS)
- Search section: `fixed top-[60px]` - hardcoded, doesn't account for safe area
- Content: `pt-[140px]` - hardcoded, doesn't match actual header+search height
- When category filters are visible, search section is ~112px tall, but content only accounts for 140px total (header 60px + ~80px), leaving ~32px overlap

---

### Solution

Restructure the modal to use a flexbox-based layout instead of fixed positioning with hardcoded pixel values. This approach is used successfully in other components like `QuestionScreen.tsx` and `MultiplayerGameScreenV2.tsx`.

---

### Technical Implementation

**File: `src/components/team/RoomIconPickerModal.tsx`**

Change from this structure:
```text
fixed inset-0 (container)
  ├── fixed top-0 (header)
  ├── fixed top-[60px] (search section)
  ├── pt-[140px] overflow-y-auto (content)
  └── fixed bottom-0 (footer)
```

To this structure:
```text
fixed inset-0 h-[100dvh] flex flex-col (container)
  ├── flex-shrink-0 pt-[env(safe-area-inset-top)] (header)
  ├── flex-shrink-0 (search section)
  ├── flex-1 overflow-y-auto (content)
  └── flex-shrink-0 pb-[env(safe-area-inset-bottom)] (footer)
```

**Key Changes:**

1. **Container**: Add `h-[100dvh] flex flex-col` to the main container

2. **Header**: Change from `fixed top-0` to `flex-shrink-0` with proper safe area padding using `pt-[env(safe-area-inset-top)]`

3. **Search Section**: Change from `fixed top-[60px]` to `flex-shrink-0` - it naturally flows after the header

4. **Scrollable Content**: Change from `h-full overflow-y-auto pt-[140px]` to `flex-1 overflow-y-auto min-h-0` - the flex-1 takes remaining space, min-h-0 ensures proper overflow

5. **Footer**: Change from `fixed bottom-0` to `flex-shrink-0` with `pb-[env(safe-area-inset-bottom)]` for safe area

---

### Benefits

- Content will be fully scrollable
- Safe areas properly respected on all devices
- No hardcoded pixel calculations
- Layout adapts when category filters show/hide
- Keyboard-friendly when editing room name

---

### Affected Files

| File | Change |
|------|--------|
| `src/components/team/RoomIconPickerModal.tsx` | Restructure layout from fixed positioning to flexbox |
