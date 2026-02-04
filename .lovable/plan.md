
# Restore Player Avatar on VS Screen

## Problem

The VS screen was modified and the player (logged-in user) section was removed. Now only the opponent is shown. The user wants to see **both** avatars:
- **Opponent** (top-left) - the matched player/bot  
- **Player** (bottom-right) - the logged-in user's own profile

Additionally:
- The category title should show "სხვადასხვა" for mixed categories
- The mystery-box icon should be displayed

## Current State

Looking at the VS screen (lines 400-437), only the opponent section exists. The player section that was at the bottom-right has been removed.

## Solution

Add back the player section at the bottom-right of the VS screen, using the authenticated user's profile data:
- `profile?.avatar_url` for the avatar
- `profile?.animated_avatar_url` for animated version  
- `profile?.nickname` for the name
- `playerLevelInfo.level` and `playerPoints` for stats

---

## Technical Changes

### File: `src/components/game/VSScreen.tsx`

**Add player section after the category section (around line 499):**

```tsx
{/* Player - Bottom Right */}
<motion.div 
  className="flex justify-end relative z-10"
  initial={{ opacity: 0, x: 50 }}
  animate={{ opacity: isOpponentLocked ? 1 : 0, x: isOpponentLocked ? 0 : 50 }}
  transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
>
  <div className="flex items-center gap-3">
    {/* Text Info - on left */}
    <div className="flex flex-col items-end text-right">
      <h3
        className="text-2xl font-black text-white"
        style={{
          fontFamily: "'TASolivare', sans-serif",
          textShadow: "0 2px 10px rgba(0,0,0,0.4)",
        }}
      >
        {profile?.nickname || t("game.you")}
      </h3>
      <p className="text-white/70 text-sm">
        {t("common.level")} {playerLevelInfo.level}
      </p>
      <p className="text-amber-300 text-sm font-medium">
        {playerPoints.toLocaleString()}
      </p>
    </div>
    {/* Avatar container */}
    <div className="w-[88px] h-[88px] rounded-full bg-white/20 flex items-center justify-center shrink-0">
      <SmartAvatar
        avatarUrl={profile?.avatar_url || defaultGuestAvatar}
        animatedAvatarUrl={profile?.animated_avatar_url}
        fallback={profile?.nickname?.charAt(0) || "?"}
        size="2xl"
        autoPlay={false}
        showSparkle={false}
      />
    </div>
  </div>
</motion.div>
```

**Key details:**
1. Position: `justify-end` places it on the right side
2. Text alignment: `items-end text-right` aligns text to the right
3. Animation: Slides in from the right (`x: 50 -> 0`) with a slight delay
4. Avatar fallback: Uses `defaultGuestAvatar` if no avatar is set
5. Shows only when opponent is locked (`isOpponentLocked ? 1 : 0`)

---

## What's Already Correct

- The category title already shows "სხვადასხვა" for mixed categories (line 463-464)
- The mystery-box icon is already imported and displayed (lines 32, 456-458)
- The icon size is `w-14 h-14` with `drop-shadow-lg`

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/game/VSScreen.tsx` | Add player section below category section, positioned at bottom-right |

---

## Visual Result

```
┌─────────────────────────────┐
│ ← [1000 coins] ?            │  Header
├─────────────────────────────┤
│ [Opponent Avatar]           │  Opponent (top-left)
│  OpponentName               │
│  Level 23                   │
│  27,614                     │
│                             │
│      🎁 (mystery-box)       │  Category (center)
│      სხვადასხვა             │
│      [Category Video]       │
│      [ახლიდან]              │
│                             │
│               PriyaF        │  Player (bottom-right)
│               Level 6       │
│               2,022         │
│           [User Avatar]     │
├─────────────────────────────┤
│     [დანწყება! button]      │  Start button
└─────────────────────────────┘
```
