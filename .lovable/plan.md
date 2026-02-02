

# Plan: Improve Chest Reward Logic

## Overview

Based on the screenshot and requirements:
1. **Remove 0-value rewards from display** - Don't show XP and diamonds if they are 0
2. **Randomize coins in 50-250 range** - Every chest opens with random coins between 50-250
3. **Special days bonus** - On weekends (Saturday/Sunday) give players +1 diamond as a gift

---

## Technical Changes

### File 1: `src/config/rewardConfig.ts`

Update chest reward configuration:

**Lines 44-48** - Change CHEST_COINS to a range and add special day logic:

```typescript
// Before:
CHEST_COINS: 250,          // Half a game stake
CHEST_GEMS: 0,             // No free gems from chest (keep gems valuable)
CHEST_COOLDOWN_HOURS: 6,   // 4x per day max
CHEST_XP: 0,               // No XP system

// After:
CHEST_COINS_MIN: 50,       // Minimum coins from chest
CHEST_COINS_MAX: 250,      // Maximum coins from chest
CHEST_GEMS: 0,             // Base gems (0 on normal days)
CHEST_WEEKEND_GEMS: 1,     // Bonus gem on special days (Saturday/Sunday)
CHEST_COOLDOWN_HOURS: 6,   // 4x per day max
CHEST_XP: 0,               // No XP from chest
```

Also add a helper function export:

```typescript
// Helper to get random chest coins
export function getRandomChestCoins(): number {
  return Math.floor(Math.random() * (REWARDS.CHEST_COINS_MAX - REWARDS.CHEST_COINS_MIN + 1)) + REWARDS.CHEST_COINS_MIN;
}

// Check if today is a special day (weekend)
export function isSpecialDay(): boolean {
  const dayOfWeek = new Date().getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
}

// Get chest gems (1 on weekends, 0 otherwise)
export function getChestGems(): number {
  return isSpecialDay() ? REWARDS.CHEST_WEEKEND_GEMS : REWARDS.CHEST_GEMS;
}
```

---

### File 2: `src/components/home/ChestRewardModal.tsx`

Update the modal to:
- Use random coins and special day gems
- Filter out 0-value rewards from display

**Lines 23-28** - Update rewards config to use dynamic values:

```typescript
// Before:
const rewardsConfig = [
  { icon: coinIcon, isImage: true, type: "coins", value: REWARDS.CHEST_COINS, gradient: "from-amber-400 to-yellow-500" },
  { icon: gemIcon, isImage: true, type: "gems", value: REWARDS.CHEST_GEMS, gradient: "from-purple-400 to-pink-500" },
  { icon: "⭐", isImage: false, type: "xp", value: REWARDS.CHEST_XP, gradient: "from-blue-400 to-cyan-500" },
];

// After: Move inside component and compute dynamically
// (remove static config, use useState)
```

**Inside component** - Generate random rewards when modal opens:

```typescript
import { getRandomChestCoins, getChestGems, isSpecialDay } from "@/config/rewardConfig";

// Inside component:
const [chestRewards, setChestRewards] = useState<{ type: string; value: number; icon: string; isImage: boolean; gradient: string }[]>([]);

useEffect(() => {
  if (isOpen && canClaimChest) {
    // Generate random rewards when opening
    const coins = getRandomChestCoins();
    const gems = getChestGems();
    
    const rewards = [
      { icon: coinIcon, isImage: true, type: "coins", value: coins, gradient: "from-amber-400 to-yellow-500" },
      { icon: gemIcon, isImage: true, type: "gems", value: gems, gradient: "from-purple-400 to-pink-500" },
    ].filter(r => r.value > 0); // Only show rewards with value > 0
    
    setChestRewards(rewards);
    
    // Confetti...
  }
}, [isOpen, canClaimChest]);
```

**Lines 60-66** - Update rewards with translated labels (use chestRewards state):

```typescript
// Create rewards with labels, filtering out zeros
const rewards = chestRewards.map(r => ({
  ...r,
  label: `${r.value} ${t(`chest.${r.type === "coins" ? "coins" : "gems"}`)}`
}));
```

**Lines 188-189** - Update FlyingCurrency to use dynamic values:

```typescript
// Use chestRewards state values instead of static REWARDS
const coinReward = chestRewards.find(r => r.type === "coins");
const gemReward = chestRewards.find(r => r.type === "gems");

<FlyingCurrency type="coins" amount={coinReward?.value || 0} isActive={showFlyingCoins} />
{gemReward && gemReward.value > 0 && (
  <FlyingCurrency type="gems" amount={gemReward.value} isActive={showFlyingGems} />
)}
```

---

### File 3: `src/hooks/useRewards.ts`

Update `recordChestReward` to handle the new dynamic rewards properly (no changes needed if we pass rewards correctly, but should verify).

---

## Summary

| Change | File | Description |
|--------|------|-------------|
| Randomize coins | `rewardConfig.ts` | Add `CHEST_COINS_MIN/MAX` (50-250) and helper functions |
| Special day gems | `rewardConfig.ts` | Add `getChestGems()` returning 1 on weekends |
| Filter 0 values | `ChestRewardModal.tsx` | Only render rewards where `value > 0` |
| Dynamic rewards | `ChestRewardModal.tsx` | Generate random values when modal opens |

---

## Visual Result

**Normal Days (Monday-Friday):**
```
┌─────────────────────────────────────┐
│      [Chest Icon]                   │
│    განძი გახსნილია!                 │
│                                     │
│  [Coin] 147 მონეტა                  │  ← Random 50-250
│                                     │
│     [ 🎁 მიღება ]                   │
└─────────────────────────────────────┘
```

**Special Days (Saturday/Sunday):**
```
┌─────────────────────────────────────┐
│      [Chest Icon]                   │
│    განძი გახსნილია!                 │
│                                     │
│  [Coin] 183 მონეტა                  │  ← Random 50-250
│  [Gem]  1 ალმასი                    │  ← Bonus gem!
│                                     │
│     [ 🎁 მიღება ]                   │
└─────────────────────────────────────┘
```

No more "0 XP" or "0 ალმასი" rows - only actual rewards are shown!

