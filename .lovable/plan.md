

# Plan: Update Reward Success Icon & Chest Cooldown

## Summary

1. Replace the party popper emoji (`🎉`) with a treasure pile icon when showing reward success notifications (chest/missions)
2. Change the chest cooldown from **6 hours** to **24 hours**

---

## Current Behavior

| Feature | Current |
|---------|---------|
| Reward success icon | Party popper emoji `🎉` |
| Chest cooldown | 6 hours |

## New Behavior

| Feature | New |
|---------|-----|
| Reward success icon | Treasure pile image (from uploaded file) |
| Chest cooldown | 24 hours |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/assets/` | Add `pile-of-treasure.png` image |
| `src/components/home/ChestRewardModal.tsx` | Update success notification to use treasure image |
| `src/components/home/MissionsModal.tsx` | Update success notification to use treasure image |
| `src/config/rewardConfig.ts` | Change `CHEST_COOLDOWN_HOURS` from 6 to 24 |
| `src/hooks/useRewardTimers.ts` | Change `CHEST_COOLDOWN_HOURS` from 6 to 24 |
| `src/config/economyConfig.ts` | Change `CHEST_COOLDOWN_HOURS` from 6 to 24 |

---

## Technical Implementation

### 1. Add Treasure Pile Image

Copy the uploaded `pile-of-treasure.png` to `src/assets/icons/` for consistent organization.

### 2. Update ChestRewardModal.tsx

Change the success notification from emoji to image:

```typescript
import treasurePileIcon from "@/assets/icons/pile-of-treasure.png";

// In handleClaim, update the notify call:
if (result.success) {
  notify.success(t("chest.rewardsReceived"), { 
    icon: <img src={treasurePileIcon} alt="" className="w-12 h-12" /> 
  });
}
```

### 3. Update MissionsModal.tsx (if applicable)

Find any similar success notifications and update to use the treasure pile icon.

### 4. Update Chest Cooldown Configuration

**src/config/rewardConfig.ts** (Line 49):
```typescript
CHEST_COOLDOWN_HOURS: 24,   // 1x per day max
```

**src/hooks/useRewardTimers.ts** (Line 23):
```typescript
const CHEST_COOLDOWN_HOURS = 24;
```

**src/config/economyConfig.ts** (Line 18):
```typescript
CHEST_COOLDOWN_HOURS: 24,
```

---

## Visual Result

**Before (reward success):**
```text
┌──────────────────────────────┐
│         🎉                   │
│   ჯილდოები მიღებულია!        │
└──────────────────────────────┘
```

**After (reward success):**
```text
┌──────────────────────────────┐
│     [Treasure Pile Icon]     │
│   ჯილდოები მიღებულია!        │
└──────────────────────────────┘
```

**Before (chest cooldown):**
- Timer shows max ~6 hours countdown

**After (chest cooldown):**
- Timer shows max ~24 hours countdown (once per day)

---

## Summary of Changes

1. Copy treasure pile image to project assets
2. Update `ChestRewardModal.tsx` to use treasure pile icon in success notification
3. Update `MissionsModal.tsx` if it has similar notifications
4. Change chest cooldown from 6 hours to 24 hours in 3 config locations

