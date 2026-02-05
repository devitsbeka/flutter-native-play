
# Plan: Fix Clipped Element Inside Avatar

## Problem

The avatar display in the AvatarModal shows a **Play button badge** (indicating animated avatar) that is clipped at the circular boundary. This creates an ugly visual artifact - a white curved element appearing inside the avatar circle.

## Root Cause

In `src/components/home/AvatarModal.tsx` (lines 561-578):

```tsx
<div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-primary/30 mb-2">
  {/* avatar image */}
  
  {/* This badge is INSIDE the overflow-hidden container */}
  {profile?.animated_avatar_url && (
    <div className="absolute top-0 right-0 w-5 h-5 bg-primary rounded-full...">
      <Play className="..." />
    </div>
  )}
</div>
```

The `overflow-hidden` on the circular container clips the badge which is positioned at `top-0 right-0`.

---

## Solution

Restructure the avatar container to position the badge **outside** the overflow-hidden element, so it renders on top without being clipped.

### File: `src/components/home/AvatarModal.tsx`

**Lines 559-579** - Restructure the avatar display:

```tsx
{/* Current Avatar */}
<div className="flex flex-col items-center">
  {/* Wrapper for proper badge positioning */}
  <div className="relative mb-2">
    {/* Avatar circle with overflow-hidden */}
    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary/30">
      {profile?.avatar_url ? (
        <img 
          src={resolveAvatarUrl(profile.avatar_url) || profile.avatar_url} 
          alt="Current avatar" 
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <ImageIcon className="w-10 h-10 text-muted-foreground" />
        </div>
      )}
    </div>
    
    {/* Play badge - OUTSIDE the overflow container */}
    {profile?.animated_avatar_url && (
      <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-md">
        <Play className="w-3 h-3 text-primary-foreground" fill="currentColor" />
      </div>
    )}
  </div>
  <p className="text-sm text-muted-foreground">{t("avatar.currentAvatar")}</p>
```

---

## Changes Made

| Change | Description |
|--------|-------------|
| New wrapper div | Added `relative mb-2` wrapper to hold both avatar and badge |
| Separated concerns | Avatar circle now only contains the image with `overflow-hidden` |
| Badge repositioned | Badge now sits outside the overflow container with `-top-1 -right-1` |
| Slightly larger badge | Increased from `w-5 h-5` to `w-6 h-6` for better visibility |
| Added shadow | `shadow-md` makes badge more visible |

---

## Result

- Clean avatar display with no clipped elements
- Play badge appears **on top** of the avatar circle border
- Badge is fully visible and not cut off
- Same functionality preserved (only shows when `animated_avatar_url` exists)
