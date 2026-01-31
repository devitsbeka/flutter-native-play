

# Simplify Level-Up Rewards to Real Mini Rewards

## Current State
The LevelUpModal currently displays calculated rewards based on complex formulas:
- **Coins**: `newLevel × 100` (e.g., Level 58 = 5,800 coins!)  
- **Gems**: Every 5 levels gives gems
- **XP Bonus**: `level × 25` 
- **Power-ups**: Based on `level / 3`

These values are inflated and don't reflect actual rewards.

## New Reward System
Per user request, level-up rewards should be simple and consistent:
- **150 coins** (fixed amount)
- **1 random power-up** (freeze, 50/50, replace, or time-drain)

---

## Files to Modify

### 1. `src/config/rewardConfig.ts`
Add new constants for the simplified level-up system:
```typescript
// ===== LEVEL UP REWARDS (SIMPLIFIED) =====
LEVEL_UP_COINS: 150,              // Fixed 150 coins per level
LEVEL_UP_POWER_UP_COUNT: 1,       // 1 random power-up
LEVEL_UP_POWER_UP_TYPES: ["5050", "freeze", "replace", "time-drain"],
```

### 2. `src/components/home/LevelUpModal.tsx`
Update the modal to show the new simplified rewards:

**Changes:**
- Remove old reward calculations (`levelUpCoins`, `levelUpGems`, `rewards.xpBonus`, etc.)
- Add `randomPowerUp` prop to know which power-up was awarded
- Show only: 150 coins + 1 power-up with its name
- Remove gems and XP bonus from display

**New Props:**
```typescript
interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  previousLevel: number;
  awardedPowerUp?: string;  // NEW: e.g., "freeze", "5050"
}
```

**UI Changes:**
- Replace coins display: Show "+150" (fixed)
- Replace XP bonus: Show the awarded power-up with its Georgian name
- Remove gems section entirely

### 3. `src/components/game/MatchResultScreen.tsx`
Update level-up reward crediting logic:

**Changes (around lines 312-334):**
- Replace complex coin calculation with `REWARDS.LEVEL_UP_COINS` (150)
- Remove gems from level-up
- Select random power-up from `LEVEL_UP_POWER_UP_TYPES`
- Credit the power-up to `user_power_ups` table
- Pass `awardedPowerUp` to `LevelUpModal`

```typescript
if (newLevelInfo.level > oldLevelInfo.level) {
  const levelUpCoins = REWARDS.LEVEL_UP_COINS; // 150
  const powerUpTypes = REWARDS.LEVEL_UP_POWER_UP_TYPES;
  const randomPowerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  
  // Credit power-up to database
  await supabase.from("user_power_ups")
    .upsert({
      user_id: currentUser.id,
      power_up_type: randomPowerUp,
      quantity: existingQuantity + 1
    });
  
  setAwardedPowerUp(randomPowerUp);
}
```

### 4. `src/pages/CategoryQuizPage.tsx`
Apply same changes to category quiz level-up logic (around lines 348-356):
- Use fixed 150 coins
- Credit 1 random power-up
- Pass power-up type to modal

### 5. `src/locales/ka.ts` (and other locale files)
Add translation for power-up reward display:
```typescript
modals: {
  // ...existing
  powerReward: "ძალა",  // "Power"
}
```

---

## Visual Result

| Before | After |
|--------|-------|
| +5,800 მონეტა (varies by level) | +150 მონეტა (fixed) |
| +1,450 XP ბონუსი | Removed |
| +19 ძალები | +1 დროის გაყინვა (random power) |
| Gems (sometimes) | Removed |

---

## Technical Details

| Change | Location | Details |
|--------|----------|---------|
| Fixed coins constant | rewardConfig.ts | `LEVEL_UP_COINS: 150` |
| Random power-up selection | MatchResultScreen.tsx, CategoryQuizPage.tsx | Random from array |
| Power-up crediting | MatchResultScreen.tsx, CategoryQuizPage.tsx | Upsert to user_power_ups |
| Modal display | LevelUpModal.tsx | Show 150 coins + 1 named power-up |
| Remove XP/gems display | LevelUpModal.tsx | Clean up reward section |

