
# Plan: Remove Screen Mirror Option & Make Weekly Challenge Clickable

## Overview
This plan addresses three changes:
1. Remove the "Screen Mirror" option from the TV Mode modal
2. Ensure TV mode is started from the Room Lobby (already works correctly)
3. Make the "კვირის გამოწვევა" (Weekly Challenge) widget clickable

---

## Change 1: Remove Screen Mirror from TVMirrorModal

### Current State
The `TVMirrorModal.tsx` shows two options when opened:
- **Screen Mirror** (AirPlay/Smart View) - shows instructions for native screen mirroring
- **მასპინძლობის დანწყება** (Start Hosting) - creates a TV session

### What to Change
Remove the Screen Mirror option entirely. The modal will only show:
- **მასპინძლობის დანწყება** (Start Hosting) option - for quick TV session creation
- Manual code entry option at the bottom

### File: `src/components/tv/TVMirrorModal.tsx`
- Delete the Screen Mirror button (lines 146-169)
- Delete the 'mirror-instructions' step entirely (lines 230-337)
- Simplify the step flow: `'choose' | 'manual-code' | 'connecting' | 'connected'`

---

## Change 2: TV Mode Flow (Already Working)

### Current State
The Room Lobby already has the correct flow:
1. Host creates a room
2. In room lobby, host sees "TV რეჟიმი" toggle
3. When enabled, `TVSetupInline` appears asking for the 4-digit code
4. Host enters code from TV → gets connected to TV session

**No changes needed** - this flow is already implemented correctly in `RoomLobbyV2.tsx`.

---

## Change 3: Make Weekly Challenge Clickable

### Current State
The Weekly Challenge widget in both sidebars is static and non-interactive:
- Shows hardcoded text: "10 თამაში ითამაშე" (Play 10 games)
- Shows hardcoded progress: "3/10 შესრულებულია" (3/10 completed)
- Has a ChevronRight icon but no click handler

### What to Create

#### A. New Modal: `WeeklyChallengeModal.tsx`
Create a modal that shows:
- Challenge title and description
- Current progress (e.g., 3/10 games played)
- Reward info (XP, coins, etc.)
- Time remaining until reset
- Call-to-action button to play

#### B. Update `TeamRightSidebar.tsx`
- Make the Weekly Challenge widget clickable
- Open the new modal when clicked

#### C. Update `ProfileRightSidebar.tsx`
- Same changes as above

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/components/challenge/WeeklyChallengeModal.tsx` | **Create** - Modal showing challenge details |
| `src/components/team/TeamRightSidebar.tsx` | **Modify** - Add onClick to open modal |
| `src/components/profile/ProfileRightSidebar.tsx` | **Modify** - Add onClick to open modal |

---

## Technical Details

### WeeklyChallengeModal Content
```text
┌─────────────────────────────────────────┐
│  🏆  კვირის გამოწვევა                    │
│                                          │
│  ──────────────────────────────────────  │
│                                          │
│  📋 დავალება:                            │
│     ითამაშე 10 თამაში ამ კვირაში         │
│                                          │
│  📊 პროგრესი:                            │
│     ████████░░░░░░░░░░░░  3/10          │
│                                          │
│  🎁 ჯილდო:                              │
│     500 XP + 100 ქულა                   │
│                                          │
│  ⏰ დარჩენილია: 5 დღე                   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │        ითამაშე ახლავე            │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Data Source
For now, the modal will use hardcoded data (matching the current widget). In the future, this can be connected to a `weekly_challenges` database table to track actual progress.

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| `TVMirrorModal.tsx` | Remove Screen Mirror option and related step |
| `WeeklyChallengeModal.tsx` | Create new modal for challenge details |
| `TeamRightSidebar.tsx` | Make Weekly Challenge widget clickable |
| `ProfileRightSidebar.tsx` | Make Weekly Challenge widget clickable |
