

# Plan: Add Coin Prices to Power-Up Purchase Buttons

## Power-Up Prices (from rewardConfig.ts)

| Power-Up | Coin Price | Calculation |
|----------|------------|-------------|
| 50/50    | 150 coins  | 30% of 500 coin stake |
| Freeze   | 100 coins  | 20% of stake |
| Replace  | 75 coins   | 15% of stake |
| Time-Drain | 100 coins | 20% of stake |

---

## Changes Required

### 1. Update MyPowersSection Component

**File:** `src/components/shop/MyPowersSection.tsx`

Add price display and coin-based purchase:

```text
Current:                          New:
┌──────────┐                     ┌──────────┐
│    🎯    │                     │    🎯    │
│   46     │                     │   46     │
│   (+)    │                     │ 🪙 150   │
└──────────┘                     └──────────┘
```

Changes:
- Import coin icon for price display
- Import REWARDS config for prices
- Replace + button with price pill showing coin icon + amount
- Pass canAffordCoins to disable button when insufficient balance

### 2. Update PowerUps.tsx Purchase Handler

**File:** `src/pages/PowerUps.tsx`

Modify `handleSinglePowerPurchase` to:
- Use `spendCoins` instead of `spendGems`
- Get price from `REWARDS.POWER_UP_PRICES[powerType]`
- Check `canAffordCoins` instead of gems balance

---

## Technical Implementation

### MyPowersSection.tsx Changes

```tsx
// Add imports
import coinIcon from "@/assets/icons/icon-coin.png";
import { REWARDS } from "@/config/rewardConfig";

// Update interface to include coin balance check
interface MyPowersSectionProps {
  powerUps: Record<PowerUpType, number>;
  onPurchaseSingle: (powerType: PowerUpType) => Promise<void>;
  isPurchasing: string | null;
  canAffordCoins: (amount: number) => boolean;
}

// Map power types to prices
const POWER_UP_COIN_PRICES: Record<PowerUpType, number> = {
  "5050": REWARDS.POWER_UP_PRICES["5050"],
  freeze: REWARDS.POWER_UP_PRICES.freeze,
  replace: REWARDS.POWER_UP_PRICES.replace,
  "time-drain": REWARDS.POWER_UP_PRICES["time-drain"],
};

// Replace + button with price pill
<button
  onClick={() => onPurchaseSingle(type)}
  disabled={isLoading || !canAffordCoins(price)}
  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/20 
             border border-amber-500/30 text-amber-700 hover:bg-amber-500/30 
             transition-colors disabled:opacity-50"
>
  {isLoading ? (
    <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
  ) : (
    <>
      <img src={coinIcon} alt="" className="w-4 h-4" />
      <span className="text-sm font-semibold">{price}</span>
    </>
  )}
</button>
```

### PowerUps.tsx Changes

```tsx
// Import REWARDS config
import { REWARDS } from "@/config/rewardConfig";

// Update useCurrency to include coin functions
const { gems, coins, spendCoins, canAffordCoins, addCoins } = useCurrency();

// Modify handleSinglePowerPurchase
const handleSinglePowerPurchase = async (powerType: PowerUpType) => {
  if (!user) {
    setShowAuthModal(true);
    return;
  }

  const price = REWARDS.POWER_UP_PRICES[powerType];

  if (!canAffordCoins(price)) {
    notify.error(t("shop.notEnoughCoins"));
    playSound("wrong-answer");
    return;
  }

  setIsPurchasing(`single_${powerType}`);

  try {
    const spent = await spendCoins(price, {
      productId: `single_${powerType}`,
      productType: "powerup",
      valueReceived: { [powerType]: 1 },
    });

    if (spent) {
      await addPowerUp(powerType, 1);
      await refetch();
      playSound("reward");
    }
  } catch (error) {
    console.error("Single power purchase failed:", error);
    notify.error(t("shop.purchaseFailed"));
  } finally {
    setIsPurchasing(null);
  }
};

// Pass canAffordCoins to MyPowersSection
<MyPowersSection
  powerUps={shopData.powerUps}
  onPurchaseSingle={handleSinglePowerPurchase}
  isPurchasing={isPurchasing}
  canAffordCoins={canAffordCoins}
/>
```

### ShopStandardLayout.tsx Changes

Update props to pass through `canAffordCoins`:

```tsx
interface ShopStandardLayoutProps {
  // ... existing props
  canAffordCoins: (amount: number) => boolean;
}

// Pass to MyPowersSection
<MyPowersSection
  powerUps={powerUps}
  onPurchaseSingle={onSinglePowerPurchase}
  isPurchasing={isPurchasing}
  canAffordCoins={canAffordCoins}
/>
```

---

## Visual Result

```text
ჩემი ძალები

     🎯         ❄️         🔄         ⏱️
  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
  │  46   │  │  49   │  │  11   │  │  22   │
  │🪙 150 │  │🪙 100 │  │🪙  75 │  │🪙 100 │
  └───────┘  └───────┘  └───────┘  └───────┘
```

- Coin icon + price replaces the + button
- Button disabled (grayed out) if user can't afford
- Tapping triggers coin purchase directly

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/shop/MyPowersSection.tsx` | Add price display, coin icon, affordability check |
| `src/pages/PowerUps.tsx` | Switch to coin-based purchase logic |
| `src/components/shop/ShopStandardLayout.tsx` | Pass through canAffordCoins prop |

---

## Summary

1. Display coin prices on each power-up card (150, 100, 75, 100 coins)
2. Replace + icon with coin icon + price pill button
3. Switch purchase from gems to coins using `spendCoins` function
4. Disable button when user can't afford the power-up

