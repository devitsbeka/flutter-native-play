
# Optimize TV Poll Screen Layout for More Players

## Problem

The current layout has the QR code and players list in a sidebar on the right, which limits vertical space for displaying 4-8 players. The user wants to:
- Move QR code to the top-right header area
- Remove redundant player count from header (already shown in players list)
- Add TV icon before the title "რა ვითამაშოთ?"
- Give players list more vertical space

## Technical Changes

### File: `src/components/tv/TVPollScreen.tsx`

#### 1. Restructure Header (Lines 59-101)

Move QR code into the header, replacing the player count badge:

**Current header right side:**
```tsx
{/* Player count + TV icon - Top Right */}
<div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl">
  <Users className="w-6 h-6 text-purple-300" />
  <span className="text-xl font-bold text-white">{players.length}</span>
  <img src={retroTvIcon} alt="TV რეჟიმი" className="w-10 h-10 object-contain" />
</div>
```

**New header right side:**
```tsx
{/* QR Code - Top Right */}
<div className="flex items-center gap-3">
  <div className="bg-white p-2 rounded-lg">
    <QRCodeSVG value={joinUrl} size={56} level="H" />
  </div>
  <div className="flex flex-col items-center">
    <span className="text-purple-300 text-xs">კოდი</span>
    <span className="text-lg font-mono font-bold text-white">{code}</span>
  </div>
</div>
```

#### 2. Add TV Icon to Title (Lines 104-116)

Replace the `Vote` icon with the retro TV icon before the title:

**Current:**
```tsx
<div className="flex items-center gap-2 mb-1">
  <Vote className="w-6 h-6 text-purple-300" />
  <h1 className="text-2xl font-bold text-white">
```

**New:**
```tsx
<div className="flex items-center gap-2 mb-1">
  <img src={retroTvIcon} alt="TV" className="w-7 h-7 object-contain" />
  <h1 className="text-2xl font-bold text-white">
```

#### 3. Restructure Main Content (Lines 118-198)

Remove QR code from the sidebar and expand players list to use more vertical space:

**Current layout:**
- Left: Suggestions grid (flex-1)
- Right: QR code + join code + Players list (w-56)

**New layout:**
- Left: Suggestions grid (flex-1)
- Right: Players list only (w-56) - with taller max-height for 8 players

Changes:
- Remove QR code container from sidebar (lines 159-169)
- Increase players list max-height from `max-h-[200px]` to `max-h-[320px]`
- Move players list to start of the sidebar

## Summary of Changes

| Element | Before | After |
|---------|--------|-------|
| Header right | Player count + TV icon | QR code + join code |
| Title icon | Vote icon | Retro TV icon |
| Sidebar | QR + code + players list | Players list only |
| Players list height | max-h-[200px] | max-h-[320px] |

## Expected Result

- QR code prominently visible in top-right header
- TV icon matches the branding before the title
- Players list has ~60% more vertical space (320px vs 200px)
- Can comfortably display 8 players without scrolling
- Cleaner, more focused layout
