

# Fix ProGiftBanner Visibility (Z-Index Issue)

## Problem
The ProGiftBanner is rendered above the avatar in the DOM, but the avatar and its surrounding elements (curved action buttons with `z-20`) visually overlap and cover the banner.

## Fix

### File: `src/pages/Index.tsx`

**Logged-in mobile banner (line 976)**
- Add `relative z-30` to the banner wrapper so it renders above the curved action buttons (`z-20`) and the avatar

Change:
```
<div className="mb-2 w-full flex justify-center">
```
To:
```
<div className="mb-2 w-full flex justify-center relative z-30">
```

**Guest mobile banner (line 591)**
- Same fix: add `relative z-30` to ensure it stays above the guest avatar

Change:
```
<div className="mb-3 w-full flex justify-center">
```
To:
```
<div className="mb-3 w-full flex justify-center relative z-30">
```
